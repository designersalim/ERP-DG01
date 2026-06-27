/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { Search, Edit, Trash, ChevronDown, ChevronUp, FileSpreadsheet, Truck, Plus, Check, Copy } from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (id: string) => void;
  onDuplicateBooking: (booking: Booking) => void;
  onStartBookingDoc: (bookings: Booking[], docType: 'pi' | 'challan') => void;
  onAddNewClick: () => void;
  onUpdateBookingStatus?: (id: string, status: 'Pending' | 'Delivered') => void;
  canEdit?: boolean;
}

export default function BookingList({
  bookings,
  onEditBooking,
  onDeleteBooking,
  onDuplicateBooking,
  onStartBookingDoc,
  onAddNewClick,
  onUpdateBookingStatus,
  canEdit = true
}: BookingListProps) {
  const [statusTab, setStatusTab] = useState<'Pending' | 'Delivered' | 'All'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Track selected bookings for PI / Challan generation
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  
  // Track expanded size breakdowns
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Reset selection
  const clearSelection = () => setSelectedIds({});

  // Dropdown options computed from bookings
  const factoryOptions = useMemo(() => {
    return Array.from(new Set(bookings.map(b => b.factoryName))).filter(Boolean);
  }, [bookings]);

  const buyerOptions = useMemo(() => {
    return Array.from(new Set(bookings.map(b => b.buyerName))).filter(Boolean);
  }, [bookings]);

  // Filter by status tab
  const tabFilteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const bStatus = b.status || 'Pending';
      if (statusTab === 'Pending') return bStatus === 'Pending';
      if (statusTab === 'Delivered') return bStatus === 'Delivered';
      return true; // All
    });
  }, [bookings, statusTab]);

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    return tabFilteredBookings.filter(b => {
      const matchesSearch = 
        (b.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.styleNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.ref && b.ref.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFactory = !factoryFilter || b.factoryName === factoryFilter;
      const matchesBuyer = !buyerFilter || b.buyerName === buyerFilter;

      return matchesSearch && matchesFactory && matchesBuyer;
    });
  }, [tabFilteredBookings, searchTerm, factoryFilter, buyerFilter]);

  // Handle checking/unchecking a booking
  const handleToggleSelect = (bk: Booking) => {
    // Collect currently selected bookings
    const selectedBookings = bookings.filter(b => selectedIds[b.id]);
    
    if (!selectedIds[bk.id] && selectedBookings.length > 0) {
      // Rule: Must be of the same factory
      const firstSelected = selectedBookings[0];
      if (firstSelected.factoryName !== bk.factoryName) {
        alert(`You can only select items belonging to the same Factory (${firstSelected.factoryName}) to merge them into a single PI or Challan.`);
        return;
      }
    }

    setSelectedIds(prev => ({
      ...prev,
      [bk.id]: !prev[bk.id]
    }));
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  // Determine which bookings are selectable (same factory constraint)
  const currentSelectedFactory = useMemo(
    () => bookings.find(b => selectedIds[b.id])?.factoryName,
    [bookings, selectedIds]
  );
  const targetFactory = factoryFilter || currentSelectedFactory;
  const selectableBookings = useMemo(
    () => targetFactory ? filteredBookings.filter(b => b.factoryName === targetFactory) : filteredBookings,
    [filteredBookings, targetFactory]
  );
  const isAllSelected = selectableBookings.length > 0 && selectableBookings.every(b => !!selectedIds[b.id]);
  const isSomeSelected = selectableBookings.some(b => !!selectedIds[b.id]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds({});
      return;
    }
    if (!targetFactory) {
      const factories = new Set(filteredBookings.map(b => b.factoryName));
      if (factories.size > 1) {
        alert('Please filter by a single factory first to use Select All.');
        return;
      }
    }
    const toSelect = targetFactory
      ? filteredBookings.filter(b => b.factoryName === targetFactory)
      : filteredBookings;
    const newIds: Record<string, boolean> = {};
    toSelect.forEach(b => { newIds[b.id] = true; });
    setSelectedIds(newIds);
  };

  const handleGenerate = (type: 'pi' | 'challan') => {
    const selectedList = bookings.filter(b => selectedIds[b.id]);
    if (selectedList.length === 0) return;
    onStartBookingDoc(selectedList, type);
  };

  const toggleExpandSizes = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to get total count
  const getBookingTotalQty = (bk: Booking): number => {
    if (bk.sizeWise) {
      return bk.sizes.reduce((sum, s) => sum + s.quantity, 0);
    }
    return bk.quantity || 0;
  };

  return (
    <div id="booking-list-panel" className="space-y-4">
      
      {/* Three Sub-tabs for Booking Status with Live Counter Badges */}
      <div className="flex border border-gray-200/80 bg-gray-50/50 p-1 rounded-xl gap-1.5 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => { setStatusTab('Pending'); clearSelection(); }}
          className={`flex-1 sm:flex-none text-center px-4.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            statusTab === 'Pending'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Delivery Due ({bookings.filter(b => (b.status || 'Pending') === 'Pending').length})
        </button>
        <button
          type="button"
          onClick={() => { setStatusTab('Delivered'); clearSelection(); }}
          className={`flex-1 sm:flex-none text-center px-4.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            statusTab === 'Delivered'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Delivered Booking ({bookings.filter(b => b.status === 'Delivered').length})
        </button>
        <button
          type="button"
          onClick={() => { setStatusTab('All'); clearSelection(); }}
          className={`flex-1 sm:flex-none text-center px-4.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            statusTab === 'All'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          All Booking ({bookings.length})
        </button>
      </div>

      {/* Search and Filters bar */}
      <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative md:col-span-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PO #, Style #, Item label..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
          />
        </div>

        <div>
          <select
            value={factoryFilter}
            onChange={(e) => {
              setFactoryFilter(e.target.value);
              clearSelection();
            }}
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
          >
            <option value="">All Factories</option>
            {factoryOptions.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={buyerFilter}
            onChange={(e) => {
              setBuyerFilter(e.target.value);
              clearSelection();
            }}
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
          >
            <option value="">All Buyers</option>
            {buyerOptions.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Warning/Selection Floating Bar */}
      {selectedCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white rounded-full p-1 text-xs">
              <Check className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-semibold text-emerald-800">
              Selected <span className="underline decoration-2">{selectedCount}</span> active items for merging.
              <span className="text-[10px] block text-emerald-600 font-normal mt-0.5">
                All selected items are from <strong>{bookings.find(b => selectedIds[b.id])?.factoryName}</strong>.
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 border border-emerald-300 hover:bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => handleGenerate('challan')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 active:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              Build Challan
            </button>
            <button
              onClick={() => handleGenerate('pi')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Build PI
            </button>
          </div>
        </div>
      )}

      {/* Main Table view */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white border border-gray-250 rounded-xl py-12 px-4 text-center">
          <p className="text-gray-500 font-medium text-sm">No bookings match the filter criteria.</p>
          {canEdit && (
            <button
              onClick={onAddNewClick}
              className="mt-3 inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase tracking-wider font-semibold rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> First Booking Entry
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-150 rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse min-w-[800px] text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-4 w-14 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="checkbox"
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected && !isAllSelected; }}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded-sm focus:ring-emerald-500 cursor-pointer"
                      title="Select All (same factory)"
                    />
                    <span className="text-[8px] font-bold tracking-tight">ALL</span>
                  </div>
                </th>
                <th className="py-3 px-4">Garments Factory</th>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4">PO & Style</th>
                <th className="py-3 px-4">Item & Ref</th>
                <th className="py-3 px-4 text-right">Qty & Price</th>
                <th className="py-3 px-4 text-right">Total USD</th>
                <th className="py-3 px-4 text-center w-36">Status</th>
                {canEdit && <th className="py-3 px-4 w-28 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredBookings.map((bk) => {
                const isSelected = !!selectedIds[bk.id];
                const isExpanded = !!expandedIds[bk.id];
                const totalQty = getBookingTotalQty(bk);
                
                const sizeUnit = bk.styleBreakdowns?.[0]?.sizeUnit || 'Pcs';
                const hasMismatch = bk.sizeWise && bk.unit === 'Dzn' && sizeUnit === 'Pcs';

                let itemTotalVal = 0;
                if (bk.styleBreakdowns && bk.styleBreakdowns.length > 0) {
                  itemTotalVal = bk.styleBreakdowns.reduce((sum, sb) => {
                    if (sb.sizeWise) {
                      const totalPcs = sb.sizes.reduce((sh, sz) => sh + sz.quantity, 0);
                      const sbSizeUnit = sb.sizeUnit || 'Pcs';
                      const needsConversion = sbSizeUnit === 'Pcs' && bk.unit === 'Dzn';
                      const displayQty = needsConversion ? (totalPcs / 12) : totalPcs;
                      return sum + (displayQty * bk.unitPrice);
                    } else {
                      return sum + ((sb.quantity || 0) * bk.unitPrice);
                    }
                  }, 0);
                } else {
                  if (bk.sizeWise) {
                    const needsConversion = bk.unit === 'Dzn'; 
                    const displayQty = needsConversion ? (totalQty / 12) : totalQty;
                    itemTotalVal = displayQty * bk.unitPrice;
                  } else {
                    itemTotalVal = (bk.quantity || 0) * bk.unitPrice;
                  }
                }

                return (
                  <React.Fragment key={bk.id}>
                    <tr
                      id={`row-${bk.id}`}
                      className={`hover:bg-emerald-50/25 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-emerald-50/40 font-medium' : ''
                      }`}
                      onClick={() => handleToggleSelect(bk)}
                    >
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(bk)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded-sm focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <span className="font-bold text-gray-900 block truncate">{bk.factoryName}</span>
                        {bk.deliveryAddress && (
                          <span className="text-[10px] text-gray-400 block truncate" title={bk.deliveryAddress}>
                            Deliv: {bk.deliveryAddress}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-gray-900">{bk.buyerName}</span>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <div className="text-xs space-y-0.5">
                          <p className="text-gray-800"><span className="text-[10px] select-none text-gray-400 uppercase font-semibold">PO:</span> <span className="font-mono font-medium">{bk.poNumber}</span></p>
                          {bk.styleNumber && (
                            <p className="text-gray-500"><span className="text-[10px] select-none text-gray-400 uppercase font-semibold">Style:</span> <span className="font-mono">{bk.styleNumber}</span></p>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <span className="text-gray-900 font-medium block truncate">{bk.itemName}</span>
                        {bk.ref && (
                          <span className="text-[10px] text-gray-400 font-mono block">Ref: {bk.ref}</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="text-xs space-y-0.5">
                          <p className="text-gray-950 font-bold flex items-center justify-end gap-1">
                            {bk.sizeWise ? (
                              <button
                                type="button"
                                onClick={(e) => toggleExpandSizes(bk.id, e)}
                                className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-sans hover:underline cursor-pointer"
                              >
                                {hasMismatch ? (
                                  <span>{totalQty.toLocaleString()} {sizeUnit}</span>
                                ) : (
                                  <span>{totalQty.toLocaleString()} {bk.unit}</span>
                                )}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            ) : (
                              <span>{totalQty.toLocaleString()} {bk.unit}</span>
                            )}
                          </p>
                          {hasMismatch && (
                            <p className="text-emerald-600 font-bold text-[10px]">
                              = {(totalQty / 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Dzn
                            </p>
                          )}
                          <p className="text-gray-400 font-mono text-[10px]">${bk.unitPrice.toFixed(4)} / {bk.unit}</p>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-xs font-bold text-gray-900">
                        ${itemTotalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {!canEdit ? (
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border inline-block ${
                            (bk.status || 'Pending') === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {(bk.status || 'Pending') === 'Delivered' ? 'Delivered' : 'Delivery Due'}
                          </span>
                        ) : (
                          <select
                            value={bk.status || 'Pending'}
                            onChange={(e) => {
                              if (onUpdateBookingStatus) {
                                onUpdateBookingStatus(bk.id, e.target.value as 'Pending' | 'Delivered');
                              }
                            }}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer select-none outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                              (bk.status || 'Pending') === 'Delivered'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <option value="Pending">Delivery Due</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        )}
                      </td>

                      {canEdit && (
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditBooking(bk)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                              title="Edit booking Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDuplicateBooking(bk)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                              title="Duplicate booking"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === bk.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200">
                                <span className="text-[9px] text-red-600 font-extrabold uppercase">Del?</span>
                                <button
                                  onClick={() => {
                                    onDeleteBooking(bk.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[8.5px] font-black uppercase rounded cursor-pointer transition-colors"
                                  title="Confirm delete"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[8.5px] font-bold uppercase rounded cursor-pointer transition-colors"
                                  title="Cancel delete"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(bk.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                                title="Delete booking"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expandable Sizing Breakdown Grid */}
                    {bk.sizeWise && isExpanded && (
                      <tr id={`expand-${bk.id}`} className="bg-gray-50/60 font-sans">
                        <td colSpan={8} className="py-3 px-8 border-t border-b border-gray-100 animate-slide-down">
                          <div className="max-w-3xl">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                              Production Sizing Matrix ({bk.unit})
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-8 gap-2 pb-1.5">
                              {bk.sizes.map((s, sIdx) => (
                                <div key={sIdx} className="bg-white border border-gray-200 rounded-md px-2.5 py-1 text-center scale-95 origin-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{s.size}</span>
                                  <span className="text-xs font-bold text-gray-800">{s.quantity.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
