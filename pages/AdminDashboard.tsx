import React, { useState } from 'react';
import { TunaiCard, TunaiButton, TunaiBadge, TunaiInput } from '../components/TunaiComponents';
import { Users, Settings, FileText, Search, MoreVertical, Shield } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'logs'>('users');

    const users = [
        { id: 1, name: 'Ahmad bin Ali', email: 'ahmad@example.com', role: 'User', status: 'Active' },
        { id: 2, name: 'Siti Sarah', email: 'siti@example.com', role: 'Admin', status: 'Active' },
        { id: 3, name: 'John Doe', email: 'john@example.com', role: 'User', status: 'Inactive' },
        { id: 4, name: 'Mei Ling', email: 'mei@example.com', role: 'Auditor', status: 'Active' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Admin Control</h1>
                    <p className="text-slate-500 text-sm">Manage users, system settings, and view logs.</p>
                </div>
                <div className="flex gap-2">
                    <TunaiButton className="gap-2">
                        <FileText size={16} /> Export Reports
                    </TunaiButton>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    System Settings
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Audit Logs
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'users' && (
                <TunaiCard>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Authorized Users</h3>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <TunaiInput placeholder="Search users..." className="pl-10" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            <div>{user.name}</div>
                                            <div className="text-xs text-slate-400 font-normal">{user.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Shield size={12} className="text-blue-500" />
                                                {user.role}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <TunaiBadge color={user.status === 'Active' ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-100'}>
                                                {user.status}
                                            </TunaiBadge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-slate-400 hover:text-slate-600" title="More Actions">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TunaiCard>
            )}

            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TunaiCard title="General Configuration">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">System Notifications</span>
                                <div className="w-10 h-6 bg-green-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Auto-Backup</span>
                                <div className="w-10 h-6 bg-slate-200 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                            </div>
                        </div>
                    </TunaiCard>
                </div>
            )}
        </div>
    );
};

