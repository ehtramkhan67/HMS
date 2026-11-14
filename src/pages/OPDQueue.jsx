import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, UserPlus, RefreshCw, Clock, CheckCircle2, Stethoscope } from 'lucide-react';
import { PageHeader, Badge } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { Loading, ErrorState, EmptyState } from '../components/States';
import { Modal } from '../components/Modal';
import { FormField, Select, Textarea } from '../components/FormFields';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { cadets } from '../data/cadets';
import { validateForm } from '../utils/helpers';

export default function OPDQueue() {
  const { role } = useAuth();
  const toast = useToast();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ cadetId: '', complaint: '', priority: 'Normal' });
  const [formErrors, setFormErrors] = useState({});

  const canModify = role === 'admin';

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQueue();
      setQueue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

  const grouped = useMemo(() => ({
    waiting: queue.filter(q => q.status === 'Waiting'),
    consulting: queue.filter(q => q.status === 'In Consultation'),
    done: queue.filter(q => q.status === 'Done'),
  }), [queue]);

  const rules = {
    cadetId: [{ type: 'required', message: 'Select a cadet' }],
    complaint: [
      { type: 'required', message: 'Chief complaint is required' },
      { type: 'min', value: 3, message: 'Describe the complaint (min 3 chars)' },
    ],
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const errs = validateForm(rules, form);
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    const cadet = cadets.find(c => c.id === form.cadetId);
    try {
      const entry = await api.addToQueue({
        ...form,
        cadetId: cadet.id,
        cadetName: cadet.name,
        collegeNumber: cadet.collegeNumber,
        kitNumber: cadet.kitNumber,
        houseName: cadet.houseName,
        className: cadet.className,
        priority: form.priority,
      });
      setQueue(prev => [...prev, entry]);
      setShowAddModal(false);
      setForm({ cadetId: '', complaint: '', priority: 'Normal' });
      toast.success(`${cadet.name} added to queue as Token #${entry.token}`);
    } catch (err) {
      toast.error('Failed to add to queue');
    }
  };

  const advanceStatus = async (item) => {
    const next = item.status === 'Waiting' ? 'In Consultation' : item.status === 'In Consultation' ? 'Done' : null;
    if (!next) return;
    try {
      await api.updateQueueStatus(item.id, next);
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: next } : q));
      toast.success(`${item.cadetName} → ${next}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const changeStatus = async (item, newStatus) => {
    try {
      await api.updateQueueStatus(item.id, newStatus);
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: newStatus } : q));
      toast.info(`${item.cadetName} → ${newStatus}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <div>
      <PageHeader
        title="Sick Report / OPD Queue"
        subtitle={`Token-based live queue — ${grouped.waiting.length} waiting, ${grouped.consulting.length} in consultation`}
        actions={
          canModify ? (
            <>
              <button onClick={loadQueue} className="btn-secondary btn-sm" aria-label="Refresh queue">
                <RefreshCw size={14} /> Refresh
              </button>
              {role !== 'admin' && (
                <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
                  <Plus size={14} /> Add to Queue
                </button>
              )}
            </>
          ) : null
        }
      />

      {loading && <Loading message="Loading queue…" />}
      {error && <ErrorState message={error} onRetry={loadQueue} />}

      {!loading && !error && queue.length === 0 && (
        <EmptyState
          title="Queue is empty"
          message="No patients in the queue right now."
          action={canModify ? <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm"><Plus size={14} /> Add First</button> : null}
        />
      )}

      {!loading && !error && queue.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiting */}
          <QueueColumn
            title="Waiting"
            icon={Clock}
            iconColor="text-primary-900"
            items={grouped.waiting}
            canModify={canModify}
            onAdvance={advanceStatus}
            emptyMsg="No one waiting"
          />
          {/* In Consultation */}
          <QueueColumn
            title="In Consultation"
            icon={Stethoscope}
            iconColor="text-amber-600"
            items={grouped.consulting}
            canModify={canModify}
            onAdvance={advanceStatus}
            onChangeStatus={changeStatus}
            emptyMsg="No one in consultation"
          />
          {/* Done */}
          <QueueColumn
            title="Done"
            icon={CheckCircle2}
            iconColor="text-emerald-600"
            items={grouped.done}
            canModify={canModify}
            onChangeStatus={changeStatus}
            emptyMsg="No completed visits yet"
            done
          />
        </div>
      )}

      {/* Add modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Cadet to OPD Queue"
        footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdd} className="btn-primary"><UserPlus size={14} /> Add to Queue</button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <FormField label="Cadet" required error={formErrors.cadetId} id="queue-cadet">
            <Select
              id="queue-cadet"
              value={form.cadetId}
              onChange={(e) => setForm(f => ({ ...f, cadetId: e.target.value }))}
              error={formErrors.cadetId}
            >
              <option value="">Select a cadet…</option>
              {cadets.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.kitNumber || '—'}) — {c.houseName}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Chief Complaint" required error={formErrors.complaint} id="queue-complaint" hint="Brief description of symptoms">
            <Textarea
              id="queue-complaint"
              value={form.complaint}
              onChange={(e) => setForm(f => ({ ...f, complaint: e.target.value }))}
              placeholder="e.g. Fever and cough for 2 days"
              rows={3}
              error={formErrors.complaint}
            />
          </FormField>

          <FormField label="Priority" id="queue-priority">
            <Select
              id="queue-priority"
              value={form.priority}
              onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

function QueueColumn({ title, icon: Icon, iconColor, items, canModify, onAdvance, onChangeStatus, emptyMsg, done }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={iconColor} />
        <h3 className="font-semibold text-dark-900 text-sm">{title}</h3>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-400">{emptyMsg}</div>
        )}
        {items.map(item => (
          <div key={item.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                item.status === 'In Consultation' ? 'bg-secondary-500 text-primary-900 font-bold' :
                item.status === 'Done' ? 'bg-emerald-100 text-emerald-700' :
                'bg-primary-900 text-white'
              }`}>
                #{item.token}
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/cadets/${item.cadetId}`} className="font-semibold text-primary-900 hover:text-secondary-600 text-sm">
                  {item.cadetName}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.kitNumber || '—'} · {item.houseName}
                </p>
                <p className="text-xs text-slate-600 mt-1.5">{item.complaint}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={item.status} />
                  {item.priority === 'Urgent' && <Badge variant="danger">Urgent</Badge>}
                </div>
                {item.consultingDoctor && (
                  <p className="text-xs text-slate-400 mt-1.5">{item.consultingDoctor}</p>
                )}
              </div>
            </div>
            {canModify && !done && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                {onAdvance && item.status !== 'Done' && (
                  <button
                    onClick={() => onAdvance(item)}
                    className={`btn-sm w-full justify-center ${item.status === 'Waiting' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {item.status === 'Waiting' ? 'Start Consultation' : 'Mark as Done'}
                  </button>
                )}
                {onChangeStatus && item.status === 'Done' && (
                  <button
                    onClick={() => onChangeStatus(item, 'Waiting')}
                    className="btn-secondary btn-sm w-full justify-center"
                  >
                    Reopen
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
