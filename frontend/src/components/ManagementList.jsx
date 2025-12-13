import React, { useEffect, useState, useRef } from 'react';

/**
 * ManagementList
 * Props:
 * - title: string
 * - listFn: () => Promise<Array>
 * - createFn: (payload) => Promise
 * - updateFn: (id, payload) => Promise
 * - deleteFn: (id) => Promise
 * - itemNameKey: string (default 'name')
 */
const ManagementList = ({ title, listFn, createFn, updateFn, deleteFn, itemNameKey = 'name' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      // Expect array or {items: []}
      const arr = Array.isArray(data) ? data : (data.items || []);
      setItems(arr);
    } catch (err) {
      console.error('Failed to load', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setInputValue(''); setShowAdd(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    try {
      const created = await createFn({ [itemNameKey]: inputValue.trim() });
      // if backend returns created object or id
      if (created) {
        await load();
      } else {
        await load();
      }
    } catch (err) {
      console.error('create failed', err);
    } finally {
      setShowAdd(false);
    }
  };

  const startEdit = (it) => { setEditingId(it.id); setInputValue(it[itemNameKey] || ''); setTimeout(() => inputRef.current?.focus(), 0); };
  const saveEdit = async (id) => {
    if (!inputValue.trim()) return;
    try {
      await updateFn(id, { [itemNameKey]: inputValue.trim() });
      await load();
    } catch (err) {
      console.error('update failed', err);
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteFn(id);
      await load();
    } catch (err) {
      console.error('delete failed', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded">Add</button>
      </div>

      {loading ? <div className="text-sm text-purple-300">Loading...</div> : (
        <div className="grid gap-2">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between bg-white/3 px-3 py-2 rounded">
              <div className="flex-1">
                {editingId === it.id ? (
                  <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full bg-transparent" />
                ) : (
                  <div className="font-medium">{it[itemNameKey]}</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId === it.id ? (
                  <>
                    <button onClick={() => saveEdit(it.id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded text-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(it)} className="px-2 py-1 rounded text-sm">Edit</button>
                    <button onClick={() => handleDelete(it.id)} className="px-2 py-1 text-red-400 rounded text-sm">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)}></div>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Add ${title}`}
            onKeyDown={(e) => {
              // basic focus trap inside modal
              if (e.key === 'Tab') {
                const focusable = Array.from(modalRef.current.querySelectorAll('button,input,textarea,a[href]')).filter(Boolean);
                if (focusable.length) {
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                }
              }
              if (e.key === 'Escape') setShowAdd(false);
            }}
            className="relative bg-white/5 p-6 rounded-lg w-full max-w-md"
          >
            <h3 className="text-lg font-semibold mb-2">Add {title}</h3>
            <input aria-label={`Name for new ${title}`} ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full px-3 py-2 rounded bg-white/3 mb-3" />
            <div className="flex justify-end gap-2">
              <button aria-label="Cancel add" onClick={() => setShowAdd(false)} className="px-3 py-2">Cancel</button>
              <button aria-label="Create item" onClick={handleCreate} className="px-3 py-2 bg-purple-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementList;
