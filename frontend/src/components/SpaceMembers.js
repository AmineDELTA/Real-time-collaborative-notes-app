import React, { useState, useEffect } from 'react';
import { spaceMembersAPI } from '../services/api';

const SpaceMembers = ({ spaceId, currentUser, onMembersUpdate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('PARTICIPANT');

  // Load members when space changes
  useEffect(() => {
    if (spaceId) {
      loadSpaceMembers();
    }
  }, [spaceId]);

  const loadSpaceMembers = async () => {
    setLoading(true);
    try {
      const spaceMembers = await spaceMembersAPI.getSpaceMembers(spaceId);
      setMembers(spaceMembers);
    } catch (error) {
      console.error('Failed to load space members:', error);
      // If no members found, show the space owner as a member
      if (error.response?.status === 500 || error.response?.status === 404) {
        // This might be a new space without members in UserInSpace table
        // Show the current user as the owner
        setMembers([{
          id: 1,
          user_id: currentUser.id,
          space_id: spaceId,
          role: 'ADMIN',
          is_creator: true,
          joined_at: new Date().toISOString(),
          username: currentUser.username,
          email: currentUser.email
        }]);
      } else {
        setMembers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await spaceMembersAPI.changeUserRole(spaceId, userId, newRole);
      await loadSpaceMembers(); // Reload members
      onMembersUpdate && onMembersUpdate();
      setShowRoleMenu(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to change user role:', error);
      alert('Failed to change user role. Please try again.');
    }
  };

  const handleRemoveUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to remove ${username} from this space?`)) {
      try {
        await spaceMembersAPI.removeUserFromSpace(spaceId, userId);
        await loadSpaceMembers(); // Reload members
        onMembersUpdate && onMembersUpdate();
      } catch (error) {
        console.error('Failed to remove user:', error);
        alert('Failed to remove user. Please try again.');
      }
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      await spaceMembersAPI.inviteUserToSpace(spaceId, inviteEmail, inviteRole);
      await loadSpaceMembers(); // Reload members
      setInviteEmail('');
      setInviteRole('PARTICIPANT');
      setShowInviteForm(false);
      alert('User invited successfully!');
    } catch (error) {
      console.error('Failed to invite user:', error);
      alert('Failed to invite user. Please check the email and try again.');
    }
  };

  // Check if current user can manage members
  const canManageMembers = () => {
    const currentUserMembership = members.find(m => m.user_id === currentUser.id);
    return currentUserMembership?.is_creator || currentUserMembership?.role === 'ADMIN';
  };

  // Get role display name
  const getRoleDisplayName = (role, isCreator) => {
    if (isCreator) return 'Owner';
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'PARTICIPANT': return 'Participant';
      case 'VISITOR': return 'Visitor';
      default: return role;
    }
  };

  // Get role color
  const getRoleColor = (role, isCreator) => {
    if (isCreator) return '#8b5cf6'; // Purple for owner
    switch (role) {
      case 'ADMIN': return '#f59e0b'; // Orange for admin
      case 'PARTICIPANT': return '#10b981'; // Green for participant
      case 'VISITOR': return '#6b7280'; // Gray for visitor
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>Members ({members.length})</h3>
        {canManageMembers() && (
          <button
            style={styles.inviteButton}
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            + Invite
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <form onSubmit={handleInviteUser} style={styles.inviteForm}>
          <input
            type="email"
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            style={styles.inviteInput}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={styles.roleSelect}
          >
            <option value="VISITOR">Visitor</option>
            <option value="PARTICIPANT">Participant</option>
            <option value="ADMIN">Admin</option>
          </select>
          <div style={styles.inviteButtons}>
            <button type="submit" style={styles.inviteSubmitButton}>
              Invite
            </button>
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              style={styles.inviteCancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Members list */}
      <div style={styles.membersList}>
        {members.map((member) => (
          <div key={member.id} style={styles.memberItem}>
            <div style={styles.memberInfo}>
              <div style={styles.memberAvatar}>
                {member.username.charAt(0).toUpperCase()}
              </div>
              <div style={styles.memberDetails}>
                <div style={styles.memberName}>
                  {member.username}
                  {member.user_id === currentUser.id && (
                    <span style={styles.youLabel}>(You)</span>
                  )}
                </div>
                <div
                  style={{
                    ...styles.memberRole,
                    color: getRoleColor(member.role, member.is_creator)
                  }}
                >
                  {getRoleDisplayName(member.role, member.is_creator)}
                </div>
              </div>
            </div>

            {/* Action buttons for admins/owners */}
            {canManageMembers() && member.user_id !== currentUser.id && (
              <div style={styles.memberActions}>
                <button
                  style={styles.actionButton}
                  onClick={() => {
                    setSelectedUser(member);
                    setShowRoleMenu(!showRoleMenu);
                  }}
                  title="Change role"
                >
                  ⚙️
                </button>
                {!member.is_creator && (
                  <button
                    style={styles.actionButton}
                    onClick={() => handleRemoveUser(member.user_id, member.username)}
                    title="Remove from space"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Role change menu */}
      {showRoleMenu && selectedUser && (
        <div style={styles.roleMenu}>
          <div style={styles.roleMenuHeader}>
            Change role for {selectedUser.username}
          </div>
          <div style={styles.roleOptions}>
            <button
              style={styles.roleOption}
              onClick={() => handleRoleChange(selectedUser.user_id, 'VISITOR')}
            >
              Visitor
            </button>
            <button
              style={styles.roleOption}
              onClick={() => handleRoleChange(selectedUser.user_id, 'PARTICIPANT')}
            >
              Participant
            </button>
            <button
              style={styles.roleOption}
              onClick={() => handleRoleChange(selectedUser.user_id, 'ADMIN')}
            >
              Admin
            </button>
          </div>
          <button
            style={styles.roleMenuClose}
            onClick={() => {
              setShowRoleMenu(false);
              setSelectedUser(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937'
  },
  inviteButton: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  inviteForm: {
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  inviteInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    fontSize: '0.875rem'
  },
  roleSelect: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    fontSize: '0.875rem'
  },
  inviteButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  inviteSubmitButton: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  inviteCancelButton: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280'
  },
  membersList: {
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto'
  },
  memberItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: 'white',
    borderRadius: '6px',
    marginBottom: '0.5rem',
    border: '1px solid #e5e7eb'
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    flex: 1
  },
  memberAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginRight: '0.75rem'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  youLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 'normal'
  },
  memberRole: {
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  memberActions: {
    display: 'flex',
    gap: '0.25rem'
  },
  actionButton: {
    padding: '0.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  roleMenu: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    minWidth: '200px'
  },
  roleMenuHeader: {
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937'
  },
  roleOptions: {
    padding: '0.5rem'
  },
  roleOption: {
    width: '100%',
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '0.875rem',
    marginBottom: '0.25rem'
  },
  roleMenuClose: {
    width: '100%',
    padding: '0.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0 0 8px 8px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  }
};

export default SpaceMembers;
