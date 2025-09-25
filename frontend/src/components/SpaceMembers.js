import React, { useState, useEffect } from 'react';
import { spaceMembersAPI } from '../services/api';

function SpaceMembers({ spaceId, currentUser, onMembersUpdate }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Store current user details for highlighting
  const [currentUserDetails, setCurrentUserDetails] = useState({
    id: currentUser?.id,
    email: currentUser?.email
  });
  
  // Update the current user details whenever currentUser prop changes
  useEffect(() => {
    if (currentUser) {
      setCurrentUserDetails({
        id: currentUser.id,
        email: currentUser.email
      });
      console.log('Current user updated:', {
        id: currentUser.id,
        email: currentUser.email
      });
    }
  }, [currentUser]);

  // Load members when spaceId changes
  useEffect(() => {
    if (spaceId) {
      loadMembers();
    }
  }, [spaceId]);

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const spaceMembers = await spaceMembersAPI.getSpaceMembers(spaceId);
      setMembers(spaceMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
      setError('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async () => {
    if (!newMemberEmail.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Use the correct API function from spaceMembersAPI
      await spaceMembersAPI.inviteUserToSpace(spaceId, newMemberEmail);
      setNewMemberEmail('');
      loadMembers(); // Reload the members list
      if (onMembersUpdate) onMembersUpdate(); // Notify parent component if callback exists
    } catch (err) {
      console.error('Failed to add member:', err);
      setError('Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (userId) => {
    // Check if we're removing ourselves
    const isLeavingSpace = userId === currentUser?.id || 
                          (currentUserDetails.id && userId === currentUserDetails.id);
    
    // Check if the user is the space owner
    const isOwner = currentUser?.role === 'OWNER';
    
    // Prepare confirmation message based on user role
    let confirmMessage = '';
    if (isLeavingSpace && isOwner) {
      confirmMessage = 'As the owner, leaving this space will DELETE it permanently for all members. Are you sure?';
    } else if (isLeavingSpace) {
      confirmMessage = 'Are you sure you want to leave this space?';
    } else {
      confirmMessage = 'Are you sure you want to remove this member?';
    }
    
    // Confirm before proceeding
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Use the correct API function from spaceMembersAPI
      await spaceMembersAPI.removeUserFromSpace(spaceId, userId);
      
      // If we're leaving, notify parent component to update spaces list and redirect
      if (isLeavingSpace) {
        // For owner leaving (space deletion), we need to handle differently
        if (isOwner) {
          // Notify parent component that space has been deleted
          if (onMembersUpdate) onMembersUpdate(true); // Pass true to indicate space deletion
        } else {
          // Regular member leaving
          if (onMembersUpdate) onMembersUpdate();
        }
      } else {
        // If removing someone else, just refresh the members list
        loadMembers();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      
      // Get detailed error message if available
      let detailedError = '';
      if (err.response?.data?.detail) {
        detailedError = err.response.data.detail;
      } else if (err.message) {
        detailedError = err.message;
      }
      
      // Format the error message
      const errorType = isLeavingSpace && isOwner ? 
        'Failed to delete space' : 
        isLeavingSpace ? 'Failed to leave space' : 'Failed to remove member';
        
      const errorMessage = detailedError ? 
        `${errorType}: ${detailedError}` : 
        errorType;
        
      setError(errorMessage);
      alert(errorMessage); // Show alert for better visibility
    } finally {
      setIsLoading(false);
    }
  };

  const changeRole = async (userId, newRole) => {
    setIsLoading(true);
    setError(null);
    try {
      await spaceMembersAPI.changeUserRole(spaceId, userId, newRole);
      loadMembers(); // Reload the members list
      if (onMembersUpdate) onMembersUpdate(); // Notify parent component if callback exists
    } catch (err) {
      console.error('Failed to change role:', err);
      setError('Failed to change role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-members">
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        fontSize: '1rem', 
        fontWeight: '600', 
        color: '#1f2937' 
      }}>
        Members
      </h3>
      
      {/* Debug info with full user details */}
      {/* Debug panel - can be removed in production */}
      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px', border: '1px solid #ddd', padding: '10px', maxWidth: '100%', overflow: 'auto', display: 'none' }}>
        <div>Your ID: {currentUser ? currentUser.id : 'Not logged in'}</div>
        <div>Your Email: {currentUser ? currentUser.email : 'N/A'}</div>
      </div>
      
      {isLoading && <p>Loading members...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <ul style={{ 
        listStyle: 'none', 
        padding: 0, 
        margin: 0,
        marginBottom: '1.5rem'
      }}>
        {members.map(member => {
          // Determine if this is the current user using multiple reliable methods
          // 1. Compare by ID if both IDs exist (convert to strings to handle type differences)
          const matchById = currentUserDetails.id && member.user_id && 
            String(member.user_id) === String(currentUserDetails.id);
            
          // 2. Compare by email (either member.email or member.user_email)
          const matchByEmail = currentUserDetails.email && 
            ((member.email && member.email === currentUserDetails.email) || 
             (member.user_email && member.user_email === currentUserDetails.email));
            
          // Use either method - email is more reliable if the currentUser came from token
          const isCurrentUser = matchById || matchByEmail;
          
          return (
            <li 
              key={member.user_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: '1px solid #e5e7eb'
              }}
            >
              <div>
                <div className={isCurrentUser ? 'current-user-highlight' : ''}
                  style={{
                    fontWeight: isCurrentUser ? 'bold' : 'normal',
                    color: isCurrentUser ? '#2563eb' : 'inherit', // Blue for current user
                    padding: '2px 6px',
                    borderRadius: isCurrentUser ? '4px' : '0',
                    borderBottom: isCurrentUser ? '2px solid #2563eb' : 'none',
                    backgroundColor: isCurrentUser ? '#eef2ff' : 'transparent',
                    display: 'inline-block'
                }}>
                  {member.username || member.email || member.user_email}
                  {isCurrentUser ? ' (you)' : ''}
                  {isCurrentUser && member.role === 'OWNER' ? (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      color: '#dc2626', 
                      fontStyle: 'italic',
                      marginTop: '2px'
                    }}>
                      Space owner (leaving will delete space)
                    </span>
                  ) : null}
                </div>
              
              {member.role && (
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1).toLowerCase()}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Role dropdown for owner */}
              {currentUser?.role === 'OWNER' && !isCurrentUser && (
                <select
                  value={member.role || ''}
                  onChange={(e) => changeRole(member.user_id, e.target.value)}
                  style={{
                    fontSize: '0.8rem',
                    padding: '2px 4px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                >
                  <option value="PARTICIPANT">Participant</option>
                  <option value="EDITOR">Editor</option>
                </select>
              )}
              
              {/* Remove button */}
              {(currentUser?.role === 'OWNER' || isCurrentUser) && (
                <button
                  onClick={() => removeMember(member.user_id)}
                  disabled={isLoading}
                  style={{
                    background: isCurrentUser && currentUser?.role === 'OWNER' ? '#fee2e2' : 'none',
                    border: isCurrentUser && currentUser?.role === 'OWNER' ? '1px solid #fca5a5' : 'none',
                    color: isCurrentUser && currentUser?.role === 'OWNER' ? '#dc2626' : 
                           isCurrentUser ? '#ff6b6b' : '#ef4444',
                    cursor: isLoading ? 'wait' : 'pointer',
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    opacity: isLoading ? 0.5 : 0.8,
                    fontWeight: isCurrentUser ? 'bold' : 'normal'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = isLoading ? 0.5 : 1}
                  onMouseLeave={(e) => e.target.style.opacity = isLoading ? 0.5 : 0.8}
                  title={isCurrentUser && currentUser?.role === 'OWNER' ? 
                        "As the owner, leaving will delete this space for all members" : ""}
                >
                  {isCurrentUser && currentUser?.role === 'OWNER' 
                    ? (isLoading ? 'Deleting space...' : 'Delete & Leave') 
                    : isCurrentUser 
                      ? (isLoading ? 'Leaving...' : 'Leave Space') 
                      : (isLoading ? 'Removing...' : 'Remove')}
                </button>
              )}
            </div>
          </li>
          );
        })}
      </ul>
      
      {/* Add new member form */}
      {currentUser?.role === 'OWNER' && (
        <div>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
            Invite a new member:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Email address"
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
            <button
              onClick={addMember}
              disabled={isLoading || !newMemberEmail.trim()}
              style={{
                padding: '0.5rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: newMemberEmail.trim() ? 'pointer' : 'not-allowed',
                opacity: newMemberEmail.trim() ? 1 : 0.7
              }}
            >
              Invite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceMembers;
