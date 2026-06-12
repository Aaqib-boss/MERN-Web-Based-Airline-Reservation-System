import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './AdminPortal.css';

export default function AdminUsers({ activeTab }) {
  const { user: currentUser, token } = useAuth();
  
  // Tab state: 'directory', 'create', 'pending', 'csv', 'logs'
  const [subTab, setSubTab] = useState('directory');
  
  // Core lists state
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showDeletedLogs, setShowDeletedLogs] = useState(false);
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Selected User for details modal
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Create member form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassport, setNewPassport] = useState('');
  const [newNationality, setNewNationality] = useState('');
  const [newDOB, setNewDOB] = useState('');

  // Reset password state
  const [resetPassUser, setResetPassUser] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Permissions state for editing
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // CSV Import state
  const [csvText, setCsvText] = useState('');

  // Footer configurations form state
  const [socialLinks, setSocialLinks] = useState([]);
  const [isAlwaysOpen, setIsAlwaysOpen] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [branchesInput, setBranchesInput] = useState('');
  const [hoursMonSatInput, setHoursMonSatInput] = useState('');
  const [hoursSunInput, setHoursSunInput] = useState('');
  const [mapUrlInput, setMapUrlInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [configSaving, setConfigSaving] = useState(false);



  // Initial load
  useEffect(() => {
    if (token && activeTab === 'users') {
      const isInitial = users.length === 0 && pendingUsers.length === 0 && auditLogs.length === 0;
      fetchData(!isInitial);
    }
  }, [token, subTab, showDeletedLogs, activeTab]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (subTab === 'directory') {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setUsers(await res.json());
        else throw new Error('Failed to load user directory.');
      } else if (subTab === 'pending' && currentUser.role === 'superadmin') {
        const res = await fetch('/api/admin/users/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setPendingUsers(await res.json());
        else throw new Error('Failed to load pending approvals queue.');
      } else if (subTab === 'logs' && currentUser.role === 'superadmin') {
        const res = await fetch(`/api/admin/audit-logs?showDeleted=${showDeletedLogs}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setAuditLogs(await res.json());
        else throw new Error('Failed to load system audit logs.');
      } else if (subTab === 'footerConfig' && currentUser.role === 'superadmin') {
        const res = await fetch('/api/config/footer');
        if (res.ok) {
          const data = await res.json();
          setSocialLinks(data.socialLinks || []);
          setIsAlwaysOpen(!!data.isAlwaysOpen);
          setAddressInput(data.address || '');
          setPhoneInput(data.phone || '');
          setEmailInput(data.email || '');
          setBranchesInput(Array.isArray(data.branches) ? data.branches.join(', ') : (data.branches || ''));
          setHoursMonSatInput(data.workingHoursMonSat || '');
          setHoursSunInput(data.workingHoursSun || '');
          setMapUrlInput(data.mapUrl || '');
          setDescriptionInput(data.description || '');
        } else throw new Error('Failed to load footer configurations.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading dashboard data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Create member traveler action
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          passportNumber: newPassport,
          nationality: newNationality,
          dateOfBirth: newDOB
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create member account.');
      }

      setSuccessMsg(`Successfully created member account for ${newName}!`);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPassport('');
      setNewNationality('');
      setNewDOB('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error creating traveler.');
    }
  };

  // Change user status action
  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const updated = await res.json();
      setSuccessMsg(`Status updated to '${newStatus}' for ${updated.user.name}`);
      // Refresh directory
      fetchData(true);
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(updated.user);
      }
    } catch (err) {
      alert(err.message || 'Failed to change user status.');
    }
  };

  // Force Logout user session
  const handleForceLogout = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/force-logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setSuccessMsg('Sessions successfully terminated. User forced to log out.');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to force logout.');
    }
  };

  // Direct reset password
  const handleDirectPasswordReset = async (e) => {
    e.preventDefault();
    if (!newResetPassword) return;
    try {
      const res = await fetch(`/api/admin/users/${resetPassUser._id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newResetPassword })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setSuccessMsg(`Successfully reset password for ${resetPassUser.name}!`);
      setResetPassUser(null);
      setNewResetPassword('');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to reset password.');
    }
  };

  // Soft delete user
  const handleSoftDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to soft delete this user? They will not be able to log in.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setSuccessMsg('User successfully soft deleted.');
      setSelectedUser(null);
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to soft delete user.');
    }
  };

  // Promote/Demote Role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const updated = await res.json();
      setSuccessMsg(`System role updated to '${newRole}' for ${updated.user.name}`);
      fetchData(true);
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(updated.user);
      }
    } catch (err) {
      alert(err.message || 'Failed to change user role.');
    }
  };

  // Update permissions
  const handlePermissionsSave = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: selectedPermissions })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const updated = await res.json();
      setSuccessMsg(`System authorizations updated for ${updated.user.name}`);
      fetchData(true);
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(updated.user);
      }
    } catch (err) {
      alert(err.message || 'Failed to update permissions.');
    }
  };

  // Approve pending admin request
  const handleApprovePending = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setSuccessMsg('Account request approved and activated successfully.');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to approve request.');
    }
  };

  // Reject pending admin request
  const handleRejectPending = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setSuccessMsg('Account request rejected successfully.');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to reject request.');
    }
  };

  // CSV Bulk Import
  const handleCSVImport = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!csvText.trim()) return;

    try {
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ csvText })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const data = await res.json();
      setSuccessMsg(data.message || `Import completed! ${data.count} accounts created.`);
      setCsvText('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to import CSV data.');
    }
  };

  // PDF ID card print trigger (from admin console)
  const handleAdminPrintCard = async (userId, name) => {
    try {
      const res = await fetch(`/api/users/${userId}/card/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to generate PDF card');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `skywave_id_card_${name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(err.message || 'Error printing ID card.');
    }
  };

  // Delete a single audit log entry (soft delete)
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to move this log entry to the Recycle Bin?')) return;
    try {
      const res = await fetch(`/api/admin/audit-logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete log entry.');
      }
      setSuccessMsg('Log entry successfully moved to Recycle Bin.');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to delete log entry.');
    }
  };

  // Restore a soft-deleted audit log entry
  const handleRestoreLog = async (logId) => {
    try {
      const res = await fetch(`/api/admin/audit-logs/${logId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to restore log entry.');
      }
      setSuccessMsg('Log entry successfully restored.');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to restore log entry.');
    }
  };

  // Clear active audit logs or purge the recycle bin
  const handleClearLogs = async (purge = false) => {
    const confirmMsg = purge 
      ? 'Are you sure you want to PERMANENTLY delete all logs in the Recycle Bin? This action cannot be undone!'
      : 'Are you sure you want to clear all active audit logs? They will be moved to the Recycle Bin.';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/audit-logs${purge ? '?purge=true' : ''}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to clear log entries.');
      }
      setSuccessMsg(purge ? 'Recycle bin permanently emptied.' : 'All active audit logs moved to Recycle Bin.');
      fetchData(true);
    } catch (err) {
      alert(err.message || 'Failed to clear log entries.');
    }
  };

  // Filters
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.passportNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nationality || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.employeeId || u.memberId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(l => 
    l.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    (l.userId?.name || '').toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    (l.userId?.email || '').toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    (l.ipAddress || '').toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: 'whatsapp', url: '' }]);
  };

  const handleRemoveSocialLink = (index) => {
    const updated = [...socialLinks];
    updated.splice(index, 1);
    setSocialLinks(updated);
  };

  const handleSocialLinkChange = (index, field, value) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const handleSaveFooterConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/config/footer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          socialLinks,
          isAlwaysOpen,
          address: addressInput,
          phone: phoneInput,
          email: emailInput,
          branches: branchesInput.split(',').map(b => b.trim()).filter(Boolean),
          workingHoursMonSat: hoursMonSatInput,
          workingHoursSun: hoursSunInput,
          mapUrl: mapUrlInput,
          description: descriptionInput
        })
      });
      if (res.ok) {
        setSuccessMsg('Footer configurations saved successfully! Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update footer configurations.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error saving footer settings.');
    } finally {
      setConfigSaving(false);
    }
  };



  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', color: 'var(--sky-gold)' }}>User & Security Center</h3>
        {successMsg && (
          <div style={{ background: 'rgba(0, 200, 83, 0.15)', color: 'var(--success)', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(255, 51, 102, 0.15)', color: 'var(--error)', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Sub tabs navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          className={`glass-button-secondary ${subTab === 'directory' ? 'active' : ''}`}
          onClick={() => setSubTab('directory')}
          style={{ padding: '6px 14px', fontSize: '12px', background: subTab === 'directory' ? 'var(--sky-primary)' : 'none', color: '#ffffff' }}
        >
          👥 User Directory
        </button>
        <button 
          className={`glass-button-secondary ${subTab === 'create' ? 'active' : ''}`}
          onClick={() => setSubTab('create')}
          style={{ padding: '6px 14px', fontSize: '12px', background: subTab === 'create' ? 'var(--sky-primary)' : 'none', color: '#ffffff' }}
        >
          ➕ Create Traveler
        </button>
        {currentUser.role === 'superadmin' && (
          <>
            <button 
              className={`glass-button-secondary ${subTab === 'pending' ? 'active' : ''}`}
              onClick={() => setSubTab('pending')}
              style={{ padding: '6px 14px', fontSize: '12px', background: subTab === 'pending' ? 'var(--sky-primary)' : 'none', color: '#ffffff' }}
            >
              ⏳ Pending Approvals ({pendingUsers.length})
            </button>
            <button 
              className={`glass-button-secondary ${subTab === 'csv' ? 'active' : ''}`}
              onClick={() => setSubTab('csv')}
              style={{ padding: '6px 14px', fontSize: '12px', background: subTab === 'csv' ? 'var(--sky-primary)' : 'none', color: '#ffffff' }}
            >
              📥 CSV Bulk Tools
            </button>
            <button 
              className={`glass-button-secondary ${subTab === 'logs' ? 'active' : ''}`}
              onClick={() => setSubTab('logs')}
              style={{ padding: '6px 14px', fontSize: '12px', background: subTab === 'logs' ? 'var(--sky-primary)' : 'none', color: '#ffffff' }}
            >
              🛡️ System Audit Logs
            </button>
            <button 
              className={`glass-button-secondary ${subTab === 'footerConfig' ? 'active' : ''}`}
              onClick={() => setSubTab('footerConfig')}
              style={{ padding: '6px 14px', fontSize: '12px', background: subTab === 'footerConfig' ? 'var(--sky-primary)' : 'none', color: '#ffffff' }}
            >
              ⚙️ Footer Settings
            </button>

          </>
        )}
      </div>

      {/* 1. DIRECTORY SUB-VIEW */}
      {subTab === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 340px' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text"
                className="glass-input"
                placeholder="🔍 Search users by name, email, ID, passport, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '13px' }}
              />
            </div>

            <div className="table-scrollbar-wrapper">
              <table className="admin-log-table">
                <thead>
                  <tr>
                    <th>Name / ID</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Status</th>
                    <th>Loyalty Tier</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        <span className="animate-spin" style={{ fontSize: '20px' }}>🔄</span> Loading directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No matching users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr 
                        key={u._id} 
                        onClick={() => {
                          setSelectedUser(u);
                          setSelectedPermissions(u.permissions || []);
                        }}
                        style={{ cursor: 'pointer', background: selectedUser?._id === u._id ? 'rgba(255,255,255,0.05)' : '' }}
                      >
                        <td>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {u.employeeId || u.memberId || '—'}
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role}`}>{u.role}</span>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 'bold', 
                            textTransform: 'uppercase',
                            color: u.status === 'active' ? 'var(--success)' : u.status === 'pending' ? 'var(--sky-gold)' : 'var(--error)' 
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 'bold', color: u.loyaltyTier === 'Gold' || u.loyaltyTier === 'Platinum' ? 'var(--sky-gold)' : '' }}>
                            {u.loyaltyTier || '—'}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Sidebar panel */}
          {selectedUser && (
            <div className="glass-card animate-scale-up" style={{ padding: '24px', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '15px' }}>User Account Operations</h4>
                <button 
                  onClick={() => setSelectedUser(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
                >
                  ×
                </button>
              </div>

              {/* Photo representation */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {selectedUser.profilePicture ? (
                  <img src={selectedUser.profilePicture} style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                ) : (
                  <div style={{ width: '80px', height: '100px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    👤
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div>Full Name: <strong>{selectedUser.name}</strong></div>
                <div>Email: <strong style={{ color: 'var(--sky-gold)' }}>{selectedUser.email}</strong></div>
                <div>System Role: <span className={`role-badge ${selectedUser.role}`}>{selectedUser.role}</span></div>
                <div>Account Status: <strong style={{ textTransform: 'uppercase', color: selectedUser.status === 'active' ? 'var(--success)' : 'var(--error)' }}>{selectedUser.status}</strong></div>
                <div>Passport: <strong>{selectedUser.passportNumber || '—'}</strong></div>
                <div>Nationality: <strong>{selectedUser.nationality || '—'}</strong></div>
                {selectedUser.memberId && <div>Member ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedUser.memberId}</strong></div>}
                {selectedUser.employeeId && <div>Employee ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedUser.employeeId}</strong></div>}
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Print Member ID Card */}
                <button 
                  className="glass-button" 
                  onClick={() => handleAdminPrintCard(selectedUser._id, selectedUser.name)}
                  style={{ width: '100%', fontSize: '11px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                >
                  <span style={{ marginRight: '8px' }}>🖨️</span>Print ID Card (PDF)
                </button>

                {/* Status Toggles (Operations admin can only modify role: 'user') */}
                {(currentUser.role === 'superadmin' || selectedUser.role === 'user') && (
                  <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {selectedUser.status === 'active' ? (
                        <>
                          <button 
                            className="glass-button-secondary" 
                            onClick={() => handleStatusChange(selectedUser._id, 'suspended')}
                            style={{ flex: 1, fontSize: '10px', height: '28px', border: '1px solid rgba(255,184,0,0.3)', color: 'var(--sky-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
                          >
                            Suspend
                          </button>
                          <button 
                            className="glass-button-secondary" 
                            onClick={() => handleStatusChange(selectedUser._id, 'blocked')}
                            style={{ flex: 1, fontSize: '10px', height: '28px', border: '1px solid rgba(255,51,102,0.3)', color: 'var(--error)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
                          >
                            Block
                          </button>
                        </>
                      ) : (
                        <button 
                          className="glass-button" 
                          onClick={() => handleStatusChange(selectedUser._id, 'active')}
                          style={{ width: '100%', fontSize: '10px', height: '28px', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                        >
                          Reactivate / Unblock
                        </button>
                      )}
                    </div>

                    {/* Force Logout */}
                    <button 
                      className="glass-button-secondary" 
                      onClick={() => handleForceLogout(selectedUser._id)}
                      style={{ fontSize: '10px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                    >
                      <span style={{ marginRight: '8px' }}>🚪</span>Force Terminate Sessions
                    </button>

                    {/* Reset Password Trigger */}
                    <button 
                      className="glass-button-secondary" 
                      onClick={() => setResetPassUser(selectedUser)}
                      style={{ fontSize: '10px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                    >
                      <span style={{ marginRight: '8px' }}>🔑</span>Reset Password
                    </button>
                  </>
                )}

                {/* Super Admin operations */}
                {currentUser.role === 'superadmin' && selectedUser._id !== currentUser.id && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>SUPER ADMIN PRIVILEGES</label>
                    
                    {/* Role toggler */}
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Shift System Role:</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button 
                          className={`glass-button-secondary ${selectedUser.role === 'user' ? 'active' : ''}`}
                          onClick={() => handleRoleChange(selectedUser._id, 'user')}
                          style={{ flex: 1, fontSize: '10px', height: '24px', background: selectedUser.role === 'user' ? 'var(--sky-primary)' : '', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
                        >
                          User
                        </button>
                        <button 
                          className={`glass-button-secondary ${selectedUser.role === 'admin' ? 'active' : ''}`}
                          onClick={() => handleRoleChange(selectedUser._id, 'admin')}
                          style={{ flex: 1, fontSize: '10px', height: '24px', background: selectedUser.role === 'admin' ? 'var(--sky-primary)' : '', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
                        >
                          Operations Admin
                        </button>
                      </div>
                    </div>

                    {/* Permissions checklist */}
                    {selectedUser.role === 'admin' && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Custom Admin Permissions</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          {['manage_flights', 'manage_bookings', 'manage_members'].map(perm => (
                            <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedPermissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedPermissions([...selectedPermissions, perm]);
                                  else setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
                                }}
                              />
                              {perm.replace('_', ' ').toUpperCase()}
                            </label>
                          ))}
                        </div>
                        <button 
                          className="glass-button" 
                          onClick={() => handlePermissionsSave(selectedUser._id)}
                          style={{ width: '100%', fontSize: '10px', height: '24px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
                        >
                          Apply Permissions
                        </button>
                      </div>
                    )}

                    {/* Soft Delete */}
                    <button 
                      className="glass-button" 
                      onClick={() => handleSoftDelete(selectedUser._id)}
                      style={{ width: '100%', fontSize: '10px', height: '28px', background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                    >
                      <span style={{ marginRight: '8px' }}>🗑️</span>Soft Delete Account
                    </button>

                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CREATE TRAVELER SUB-VIEW */}
      {subTab === 'create' && (
        <div className="glass-card animate-scale-up" style={{ maxWidth: '600px', padding: '30px', margin: '0 auto' }}>
          <h4 style={{ fontSize: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '20px' }}>
            Register New Traveler Account
          </h4>

          <form onSubmit={handleCreateMember}>
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Full Name</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Enter traveler full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Email Address</label>
              <input 
                type="email" 
                className="glass-input" 
                placeholder="traveler@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Default Password</label>
              <input 
                type="password" 
                className="glass-input" 
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Passport Number (Optional)</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Passport ID"
                value={newPassport}
                onChange={(e) => setNewPassport(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-field">
                <label>Nationality</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. India"
                  value={newNationality}
                  onChange={(e) => setNewNationality(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Date of Birth</label>
                <input 
                  type="date" 
                  className="glass-input" 
                  value={newDOB}
                  onChange={(e) => setNewDOB(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', height: '40px' }}>
              Create Traveler Account ➔
            </button>
          </form>
        </div>
      )}

      {/* 3. PENDING APPROVALS SUB-VIEW */}
      {subTab === 'pending' && currentUser.role === 'superadmin' && (
        <div className="table-scrollbar-wrapper">
          <table className="admin-log-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email Address</th>
                <th>Requested Role</th>
                <th>Request Date</th>
                <th style={{ textAlign: 'center' }}>Approval Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    <span className="animate-spin" style={{ fontSize: '20px' }}>🔄</span> Loading approvals queue...
                  </td>
                </tr>
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    No pending registration approvals in queue.
                  </td>
                </tr>
              ) : (
                pendingUsers.map(u => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleString()}</td>
                    <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="glass-button" 
                        onClick={() => handleApprovePending(u._id)}
                        style={{ padding: '4px 12px', fontSize: '11px', height: '26px', background: 'var(--success)' }}
                      >
                        Approve
                      </button>
                      <button 
                        className="glass-button" 
                        onClick={() => handleRejectPending(u._id)}
                        style={{ padding: '4px 12px', fontSize: '11px', height: '26px', background: 'var(--error)' }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. CSV BULK TOOLS SUB-VIEW */}
      {subTab === 'csv' && currentUser.role === 'superadmin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          
          {/* CSV Import */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '16px' }}>
              CSV Bulk Import Members
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Paste CSV format values to import traveler accounts. Format: <br />
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px', fontSize: '10.5px' }}>
                name,email,password,nationality,passport
              </code>
            </p>

            <form onSubmit={handleCSVImport}>
              <textarea 
                className="glass-input" 
                rows="8" 
                placeholder='John Doe,john@gmail.com,pass123,India,L1234567&#10;Alice Smith,alice@gmail.com,pass456,USA,K9876543'
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '11px', padding: '12px', resize: 'vertical' }}
                required
              />
              <button 
                type="submit" 
                className="glass-button" 
                style={{ width: '100%', marginTop: '16px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
              >
                <span style={{ marginRight: '8px' }}>📥</span>Execute Bulk CSV Import
              </button>
            </form>
          </div>

          {/* Export database */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4 style={{ fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '16px' }}>
              Export Database Backup
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Download a complete CSV backup of the registered accounts database including names, emails, roles, passport numbers, and loyalty tiers.
            </p>

            {/* Direct download link with authentication authorization token inside query or trigger download */}
            <a 
              href={`/api/admin/users/export?token=${token}`}
              onClick={(e) => {
                e.preventDefault();
                // Download using fetch
                fetch(`/api/admin/users/export`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.blob())
                .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `skywave_users_backup_${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                })
                .catch(err => alert('Export failed.'));
              }}
              className="glass-button" 
              style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '38px', padding: '0 16px', textDecoration: 'none' }}
            >
              <span style={{ marginRight: '8px' }}>📤</span>Export Database (CSV)
            </a>
          </div>

        </div>
      )}

      {/* 5. AUDIT LOGS SUB-VIEW */}
      {subTab === 'logs' && currentUser.role === 'superadmin' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <input 
              type="text"
              className="glass-input"
              placeholder="🔍 Filter audit logs by action, desc, user or IP..."
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '13px' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Recycle Bin Toggle */}
              <button 
                className={`glass-button-secondary ${showDeletedLogs ? 'active' : ''}`}
                onClick={() => setShowDeletedLogs(!showDeletedLogs)}
                style={{ 
                  fontSize: '12px', 
                  height: '36px', 
                  padding: '0 14px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: showDeletedLogs ? 'rgba(255, 184, 0, 0.15)' : 'none',
                  border: showDeletedLogs ? '1px solid var(--sky-gold)' : '1px solid rgba(255,255,255,0.15)',
                  color: showDeletedLogs ? 'var(--sky-gold)' : '#ffffff'
                }}
              >
                <span style={{ marginRight: '8px' }}>{showDeletedLogs ? '📂' : '♻️'}</span>
                {showDeletedLogs ? 'Active Logs' : 'Recycle Bin'}
              </button>

              {/* Clear/Purge Action */}
              <button 
                className="glass-button-secondary"
                onClick={() => handleClearLogs(showDeletedLogs)}
                style={{ 
                  fontSize: '12px', 
                  height: '36px', 
                  padding: '0 14px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: showDeletedLogs ? '1px solid rgba(255,51,102,0.4)' : '1px solid rgba(255,255,255,0.15)',
                  color: showDeletedLogs ? 'var(--error)' : '#ffffff'
                }}
              >
                <span style={{ marginRight: '8px' }}>{showDeletedLogs ? '🔥' : '🧹'}</span>
                {showDeletedLogs ? 'Empty Bin' : 'Clear All'}
              </button>

              {/* Download CSV */}
              <button 
                className="glass-button"
                onClick={() => {
                  fetch(`/api/admin/audit-logs?format=csv&showDeleted=${showDeletedLogs}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  .then(r => r.blob())
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = showDeletedLogs 
                      ? `skywave_deleted_audit_logs_${Date.now()}.csv` 
                      : `skywave_active_audit_logs_${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  })
                  .catch(err => alert('Logs download failed.'));
                }}
                style={{ 
                  fontSize: '12px', 
                  height: '36px', 
                  padding: '0 14px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}
              >
                <span style={{ marginRight: '8px' }}>📥</span>Download CSV
              </button>
            </div>
          </div>

          <div className="table-scrollbar-wrapper">
            <table className="admin-log-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>IP Address</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                      <span className="animate-spin" style={{ fontSize: '20px' }}>🔄</span> Loading system logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No matching activity logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(l => (
                    <tr key={l._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                      <td>
                        <strong>{l.userId?.name || 'System'}</strong>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{l.userId?.email || '—'}</div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          background: l.action.includes('fail') || l.action.includes('lock') || l.action.includes('reject') ? 'rgba(255,51,102,0.15)' : 'rgba(0,102,204,0.15)',
                          color: l.action.includes('fail') || l.action.includes('lock') || l.action.includes('reject') ? 'var(--error)' : 'var(--sky-accent)'
                        }}>
                          {l.action.toUpperCase()}
                        </span>
                      </td>
                      <td>{l.description}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{l.ipAddress || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {showDeletedLogs ? (
                          <button 
                            className="glass-button"
                            onClick={() => handleRestoreLog(l._id)}
                            style={{ 
                              fontSize: '10.5px', 
                              height: '26px', 
                              padding: '0 10px', 
                              background: 'var(--success)',
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ marginRight: '8px' }}>⏪</span>Restore
                          </button>
                        ) : (
                          <button 
                            className="glass-button-secondary"
                            onClick={() => handleDeleteLog(l._id)}
                            style={{ 
                              fontSize: '10.5px', 
                              height: '26px', 
                              padding: '0 10px', 
                              border: '1px solid rgba(255,51,102,0.3)', 
                              color: 'var(--error)',
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ marginRight: '8px' }}>🗑️</span>Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5b. FOOTER SOCIAL SETTINGS SUB-VIEW */}
      {subTab === 'footerConfig' && currentUser.role === 'superadmin' && (
        <div className="glass-card animate-scale-up" style={{ maxWidth: '650px', padding: '30px', margin: '20px auto' }}>
          <h4 style={{ fontSize: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '20px', color: 'var(--sky-gold)' }}>
            ⚙️ Website Footer Settings
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
            Configure and edit all columns in the public website footer dynamically, including contact details, branches, operating hours, maps, and active social links.
          </p>

          <form onSubmit={handleSaveFooterConfig}>
            {/* 1. Branding & Description */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <h5 style={{ fontSize: '14px', color: 'var(--sky-accent)', marginBottom: '12px' }}>Branding Info</h5>
              <div className="form-field">
                <label>Footer Brand Description</label>
                <textarea 
                  className="glass-input" 
                  rows="2"
                  placeholder="Enter premium description text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  required
                  style={{ resize: 'vertical', fontFamily: 'inherit', padding: '10px 14px' }}
                />
              </div>
            </div>

            {/* 2. Contact & Location */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <h5 style={{ fontSize: '14px', color: 'var(--sky-accent)', marginBottom: '12px' }}>Contact & Location</h5>
              <div className="form-field" style={{ marginBottom: '12px' }}>
                <label>Physical Address</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. 25st Lazarus road, Periyamulla, Negombo"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-field">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. +94 77 431 1051"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Support Email Address</label>
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="e.g. support@skywave.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Branches list */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <h5 style={{ fontSize: '14px', color: 'var(--sky-accent)', marginBottom: '12px' }}>Our Branches</h5>
              <div className="form-field">
                <label>Branches List (Comma-separated)</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Colombo, Wattala, Negombo, Jaffna, Kandy"
                  value={branchesInput}
                  onChange={(e) => setBranchesInput(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 4. Working Hours */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h5 style={{ fontSize: '14px', color: 'var(--sky-accent)', margin: 0 }}>Working Hours</h5>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={isAlwaysOpen}
                    onChange={(e) => setIsAlwaysOpen(e.target.checked)}
                  />
                  Open 24 Hours / 7 Days
                </label>
              </div>
              
              {!isAlwaysOpen ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="animate-fade-in">
                  <div className="form-field">
                    <label>Mon - Sat Hours</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. 8:00 AM - 6:00 PM"
                      value={hoursMonSatInput}
                      onChange={(e) => setHoursMonSatInput(e.target.value)}
                      required={!isAlwaysOpen}
                    />
                  </div>
                  <div className="form-field">
                    <label>Sunday Hours</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. Closed"
                      value={hoursSunInput}
                      onChange={(e) => setHoursSunInput(e.target.value)}
                      required={!isAlwaysOpen}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 184, 0, 0.05)', border: '1px dashed rgba(255, 184, 0, 0.2)', padding: '12px', borderRadius: '4px', fontSize: '12.5px', color: 'var(--sky-gold)', textAlign: 'center' }}>
                  🕒 Footer will display: <strong>24 Hours & 7 Days</strong>
                </div>
              )}
            </div>

            {/* 5. Google Maps Link */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <h5 style={{ fontSize: '14px', color: 'var(--sky-accent)', marginBottom: '12px' }}>Google Maps Location</h5>
              <div className="form-field">
                <label>Maps Direction Link (URL)</label>
                <input 
                  type="url" 
                  className="glass-input" 
                  placeholder="https://maps.google.com/..."
                  value={mapUrlInput}
                  onChange={(e) => setMapUrlInput(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 6. Social Media Links */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h5 style={{ fontSize: '14px', color: 'var(--sky-accent)', margin: 0 }}>Social Media Links</h5>
                <button 
                  type="button" 
                  className="glass-button-secondary"
                  onClick={handleAddSocialLink}
                  style={{ padding: '4px 10px', fontSize: '11px', height: '26px', background: 'var(--sky-primary)' }}
                >
                  ➕ Add Social Link
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Configure dynamic social channels. WhatsApp inputs can be plain phone numbers (e.g. 0774311051).
              </p>

              {socialLinks.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', padding: '20px', borderRadius: '6px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No active social media links configured. Click "Add Social Link" above to configure.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {socialLinks.map((link, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 40px', gap: '10px', alignItems: 'center' }} className="animate-fade-in">
                      <select 
                        className="glass-input"
                        value={link.platform}
                        onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                        style={{ height: '36px', padding: '0 8px', fontSize: '12.5px' }}
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram</option>
                        <option value="x">X (Twitter)</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="pinterest">Pinterest</option>
                      </select>
                      
                      <input 
                        type="text"
                        className="glass-input"
                        placeholder={link.platform === 'whatsapp' ? 'e.g. 0774311051 or link' : 'https://...'}
                        value={link.url}
                        onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                        required
                        style={{ height: '36px', fontSize: '12.5px' }}
                      />
                      
                      <button
                        type="button"
                        className="glass-button-secondary"
                        onClick={() => handleRemoveSocialLink(index)}
                        style={{ height: '36px', width: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,51,102,0.3)', color: 'var(--error)' }}
                        title="Delete Link"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="glass-button" 
              style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={configSaving}
            >
              {configSaving ? 'Saving Changes...' : 'Save Settings & Update Footer ➔'}
            </button>
          </form>
        </div>
      )}



      {/* 6. RESET PASSWORD OVERLAY MODAL */}
      {resetPassUser && (
        <div className="auth-modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="auth-modal-content glass-card animate-scale-up" style={{ maxWidth: '400px', padding: '30px' }}>
            <h4 style={{ fontSize: '15px', marginBottom: '16px' }}>Reset Password for {resetPassUser.name}</h4>
            <form onSubmit={handleDirectPasswordReset}>
              <div className="form-field" style={{ marginBottom: '20px' }}>
                <label>New Administrative Password</label>
                <input 
                  type="password"
                  className="glass-input"
                  placeholder="Enter new secure password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="glass-button-secondary" 
                  onClick={() => { setResetPassUser(null); setNewResetPassword(''); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="glass-button" 
                  style={{ flex: 1.5 }}
                >
                  Confirm Reset ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
