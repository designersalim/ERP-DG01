/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BankDetails } from '../types';
import { Plus, Trash, Edit, CreditCard, Landmark, Check, HelpCircle } from 'lucide-react';

interface BankManagerProps {
  banks: BankDetails[];
  onAddBank: (bank: Omit<BankDetails, 'id'>) => void;
  onUpdateBank: (bank: BankDetails) => void;
  onDeleteBank: (id: string) => void;
  canEdit?: boolean;
}

export default function BankManager({ banks, onAddBank, onUpdateBank, onDeleteBank, canEdit = true }: BankManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDetails | null>(null);

  // New bank form fields
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [routingNo, setRoutingNo] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [address, setAddress] = useState('');

  const resetForm = () => {
    setBankName('');
    setBranch('');
    setAccountName('');
    setAccountNo('');
    setRoutingNo('');
    setSwiftCode('');
    setAddress('');
    setIsAdding(false);
    setEditingBank(null);
  };

  const startEdit = (bank: BankDetails) => {
    setEditingBank(bank);
    setBankName(bank.bankName);
    setBranch(bank.branch);
    setAccountName(bank.accountName);
    setAccountNo(bank.accountNo);
    setRoutingNo(bank.routingNo);
    setSwiftCode(bank.swiftCode);
    setAddress(bank.address || '');
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNo) return;

    if (editingBank) {
      onUpdateBank({
        id: editingBank.id,
        bankName,
        branch,
        accountName,
        accountNo,
        routingNo,
        swiftCode,
        address
      });
    } else {
      onAddBank({
        bankName,
        branch,
        accountName,
        accountNo,
        routingNo,
        swiftCode,
        address
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-6" id="bank-manager-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" />
            Bank Details Configuration
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage corporate bank accounts used to auto-populate Proforma Invoices (PI).
          </p>
        </div>
        {!isAdding && canEdit && (
          <button
            type="button"
            id="add-bank-btn"
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-500 text-white font-medium text-xs uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Bank
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white border border-emerald-100 rounded-xl p-5 shadow-xs space-y-4 max-w-2xl" id="bank-form">
          <h3 className="text-sm font-bold text-emerald-800 border-b border-emerald-50 pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            {editingBank ? 'Edit Bank Account details' : 'Register New Bank Account'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Mutual Trust Bank PLC"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Branch Name</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Dilkusha Branch, Dhaka"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Account Beneficiary Name *</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Acoola Trims Corporation"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="e.g. 0012-0210034567"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Routing Number</label>
              <input
                type="text"
                value={routingNo}
                onChange={(e) => setRoutingNo(e.target.value)}
                placeholder="e.g. 145260123"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">SWIFT Code</label>
              <input
                type="text"
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value)}
                placeholder="e.g. MTBLBDDHxxx"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Bank Address (Official / Branch Address)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Dilkusha Commercial Area, Motijheel, Dhaka-1000, Bangladesh"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-50">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs uppercase tracking-wider font-semibold rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 text-white text-xs uppercase tracking-wider font-semibold rounded-md hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
            >
              {editingBank ? 'Save Changes' : 'Register Account'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banks.map((bank) => {
          const isSystemDefault = bank.id === 'bank-1' || bank.id === 'bank-2';
          return (
            <div
              key={bank.id}
              className={`bg-white border rounded-xl p-5 relative overflow-hidden group transition-all duration-200 shadow-xs hover:shadow-md ${
                isSystemDefault ? 'border-sky-100 hover:border-sky-200' : 'border-gray-200 hover:border-emerald-200'
              }`}
              id={`bank-card-${bank.id}`}
            >
              {isSystemDefault && (
                <div className="absolute top-0 right-0 bg-sky-50 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Default Bank
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${isSystemDefault ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="space-y-1 pr-6">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{bank.bankName}</h4>
                  <p className="text-xs text-gray-500">{bank.branch || 'N/A'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Account name</span>
                  <span className="text-gray-800 font-medium truncate block" title={bank.accountName}>{bank.accountName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Account No</span>
                  <span className="text-gray-800 font-mono font-medium block">{bank.accountNo}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Routing No</span>
                  <span className="text-gray-700 font-mono italic block">{bank.routingNo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">SWIFT Code</span>
                  <span className="text-gray-700 font-mono font-medium block">{bank.swiftCode || 'N/A'}</span>
                </div>
              </div>

              {bank.address && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Bank Address</span>
                  <span className="text-gray-800 font-medium block leading-normal">{bank.address}</span>
                </div>
              )}

              {canEdit && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(bank)}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Edit Bank"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {!isSystemDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this bank?')) {
                          onDeleteBank(bank.id);
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Bank"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
