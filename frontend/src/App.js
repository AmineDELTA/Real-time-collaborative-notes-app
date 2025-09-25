import './services/App.css'
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import AuthContainer from './components/AuthContainer';
import { apiUtils, spacesAPI, blocksAPI, authAPI } from './services/api';
import SpaceMembers from './components/SpaceMembers';

// API configuration
const API_BASE_URL = 'http://localhost:8000';

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSpace, setCurrentSpace] = useState(null);
  const [spaces, setSpaces] = useState([]);
  
  // Editor state (your existing code)
  const [blocks, setBlocks] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const blockRefs = useRef({});
  const dragState = useRef({ draggingId: null });
  
  // Loading states
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  
  // UI state
  const [newSpaceName, setNewSpaceName] = useState('');
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const createSpaceInputRef = useRef(null);

  // Check authentication on app start
  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      handleAuthSuccess();
    }
  }, []);

  // WebSocket connection for real-time updates
  const [socket, setSocket] = useState(null);
  
  // Set up WebSocket connection when space changes
  useEffect(() => {
    if (!currentSpace || !currentUser) return;
    
    // Close any existing connection
    if (socket) {
      socket.close();
    }
    
    // Load blocks for the current space
    loadBlocksForSpace(currentSpace.id);
    
    // Create a new WebSocket connection
    const wsUrl = `ws://localhost:8000/ws/${currentSpace.id}?token=${localStorage.getItem('access_token')}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`WebSocket connected to space ${currentSpace.id}`);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'block_deleted':
            // If another user deleted a block, remove it from our state
            if (data.deleted_by !== currentUser.id) {
              console.log(`Block ${data.block_id} was deleted by ${data.deleted_by_username}`);
              setBlocks(prev => prev.filter(b => b.id !== data.block_id));
            }
            break;
            
          case 'block_updated':
            // If another user updated a block, update it in our state
            if (data.updated_by !== currentUser.id) {
              console.log(`Block ${data.block_id} was updated by ${data.updated_by_username}`);
              setBlocks(prev => prev.map(b => 
                b.id === data.block_id ? { ...b, ...data.changes } : b
              ));
            }
            break;
            
          case 'block_created':
            // If another user created a block, add it to our state
            if (data.created_by !== currentUser.id) {
              console.log(`New block created by ${data.created_by_username}`);
              setBlocks(prev => [...prev, data.block]);
            }
            break;
            
          case 'blocks_reordered':
            // If another user reordered blocks, refresh our blocks
            if (data.reordered_by !== currentUser.id) {
              console.log(`Blocks reordered by ${data.reordered_by_username}`);
              loadBlocksForSpace(currentSpace.id);
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setSocket(ws);
    
    // Clean up on unmount or when space changes
    return () => {
      if (ws) {
        console.log('Closing WebSocket connection');
        ws.close();
      }
    };
  }, [currentSpace, currentUser]);

  // Auto-focus last block (your existing code)
  useEffect(() => {
    const last = blocks[blocks.length - 1];
    if (last && blockRefs.current[last.id]) {
      setTimeout(() => blockRefs.current[last.id].focus(), 10);
    }
  }, [blocks.length]);
  
  // Effect to focus the input when popup opens
  useEffect(() => {
    if (createSpaceOpen && createSpaceInputRef.current) {
      setTimeout(() => {
        createSpaceInputRef.current.focus();
      }, 100);
    }
  }, [createSpaceOpen]);
  
  // Click outside handler to close the popup
  useEffect(() => {
    // Only add listeners if authenticated and popup is open
    if (!isAuthenticated) return;
    
    const handleClickOutside = (event) => {
      if (createSpaceOpen && 
          createSpaceInputRef.current && 
          !createSpaceInputRef.current.contains(event.target) &&
          !event.target.classList.contains('create-space-button')) {
        setCreateSpaceOpen(false);
      }
    };
    
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && createSpaceOpen) {
        setCreateSpaceOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [createSpaceOpen, isAuthenticated]);

  // Authentication handlers
  const handleAuthSuccess = async () => {
    try {
      // Get current user info from API
      const userData = await authAPI.getCurrentUser();
      apiUtils.setUser(userData);
      setCurrentUser(userData);

      // Load user's spaces
      await loadUserSpaces();
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth success error:', error);
      // If there's an error, clear auth and show login
      apiUtils.clearAuth();
    }
  };

  const handleLogout = () => {
    apiUtils.clearAuth();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentSpace(null);
    setSpaces([]);
    setBlocks([]);
  };

  // Space management
  const loadUserSpaces = async () => {
    setIsLoadingSpaces(true);
    try {
      const userSpaces = await spacesAPI.getMySpaces();
      console.log('Loaded spaces:', userSpaces);
      setSpaces(userSpaces);
      
      // If current space is no longer in the list (deleted or left), reset it
      if (currentSpace && userSpaces.length > 0) {
        const stillExists = userSpaces.some(space => space.id === currentSpace.id);
        if (!stillExists) {
          console.log('Current space no longer exists, resetting');
          setCurrentSpace(null);
        }
      }
      
      // Auto-select first space if available and none is currently selected
      if (userSpaces.length > 0 && !currentSpace) {
        console.log('Auto-selecting first space');
        setCurrentSpace(userSpaces[0]);
      } else if (userSpaces.length === 0) {
        // If there are no spaces at all, make sure currentSpace is null
        console.log('No spaces available');
        setCurrentSpace(null);
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  const createNewSpace = async (spaceName) => {
    try {
      console.log("Calling API to create space with name:", spaceName);
      const newSpace = await spacesAPI.createSpace({ name: spaceName });
      console.log("API returned new space:", newSpace);
      
      if (!newSpace || !newSpace.id) {
        throw new Error("API returned invalid space data");
      }
      
      // Update local state with the new space
      setSpaces(prev => [...prev, newSpace]);
      setCurrentSpace(newSpace);
      
      // Let the user know it was successful
      console.log("Successfully created space:", newSpace.name);
      return newSpace;
    } catch (error) {
      console.error('Failed to create space:', error);
      // More detailed error information for debugging
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response status:', error.response.status);
        throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  };

  // Block management
  const loadBlocksForSpace = async (spaceId) => {
    setIsLoadingBlocks(true);
    try {
      const spaceBlocks = await blocksAPI.getBlocksForSpace(spaceId);
      setBlocks(spaceBlocks);
    } catch (error) {
      console.error('Failed to load blocks:', error);
      setBlocks([]);
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const saveBlock = async (blockData) => {
    try {
      if (blockData.id && blockData.id > 0) {
        // Update existing block - only send the fields that need to be updated
        const updateData = {};
        
        if (blockData.content !== undefined) updateData.content = blockData.content;
        if (blockData.type !== undefined) updateData.type = blockData.type;
        if (blockData.order !== undefined) updateData.order = blockData.order;
        
        // Add any other fields that might need updating
        if (Object.keys(updateData).length === 0) {
          console.warn('No fields to update for block:', blockData.id);
          return;
        }
        
        console.log(`Saving block ${blockData.id} with data:`, updateData);
        const updated = await blocksAPI.updateBlock(blockData.id, updateData);
        console.log(`Block ${blockData.id} updated successfully:`, updated);
        return updated;
      } else {
        // Create new block
        const createData = {
          ...blockData,
          space_id: currentSpace.id
        };
        
        console.log('Creating new block with data:', createData);
        const newBlock = await blocksAPI.createBlock(createData);
        console.log('New block created successfully:', newBlock);
        return newBlock;
      }
    } catch (error) {
      console.error('Failed to save block:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error; // Re-throw the error for the calling function to handle
    }
  };

  // Your existing helper functions (unchanged)
  const getCaretOffset = (element) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return element.textContent.length;
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  };

  const setCaretOffset = (element, offset) => {
    const selection = window.getSelection();
    const range = document.createRange();
    let current = 0;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
      const next = current + node.textContent.length;
      if (offset <= next) {
        range.setStart(node, Math.max(0, offset - current));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      current = next;
      node = walker.nextNode();
    }
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const getLineStartOffset = (text, offset) => {
    const idx = text.lastIndexOf('\n', Math.max(0, offset - 1));
    return idx === -1 ? 0 : idx + 1;
  };

  const prefixBullets = (text) => {
    return (text || '').split('\n').map(line => line.startsWith('• ') ? line : `• ${line}`).join('\n');
  };

  const hasAnyBullet = (text) => (text || '').split('\n').some(line => line.startsWith('• '));

  const numberLines = (text) => {
    return (text || '').split('\n').map((line, i) => {
      const match = line.match(/^(\d+)\.\s/);
      return match ? line : `${i + 1}. ${line}`;
    }).join('\n');
  };

  const hasAnyNumber = (text) => (text || '').split('\n').some(line => /^\d+\.\s/.test(line));

  const renumberLines = (text) => {
    const lines = (text || '').split('\n');
    let idx = 1;
    return lines.map(line => {
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        const withNum = `${idx}. ${content}`;
        idx += 1;
        return withNum;
      }
      return line;
    }).join('\n');
  };

  const normalizeListLines = (text) => {
    const lines = (text || '').split('\n');
    const isListLine = (l) => /^\d+\.\s/.test(l) || l.startsWith('• ');
    const result = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === '' && i > 0 && i < lines.length - 1 && isListLine(lines[i - 1]) && isListLine(lines[i + 1])) {
        continue;
      }
      result.push(line);
    }
    return result.join('\n');
  };

  const stripListPrefixes = (text) => {
    return (text || '').split('\n').map(line => {
      if (line.startsWith('• ')) return line.slice(2);
      return line.replace(/^\d+\.\s/, '');
    }).join('\n');
  };

  const getLineInfoAtCaret = (element) => {
    const text = element.textContent || '';
    const offset = getCaretOffset(element);
    const start = getLineStartOffset(text, offset);
    const endBreak = text.indexOf('\n', offset);
    const end = endBreak === -1 ? text.length : endBreak;
    return { text, offset, start, end, lineText: text.slice(start, end) };
  };

  const insertTextAtCaret = (textToInsert) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const node = document.createTextNode(textToInsert);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Your existing CRUD functions (modified to save to backend)
  const updateBlockContent = async (id, content) => {
    const block = blocks.find(b => b.id === id);
    if (!block) {
      console.error(`Cannot update block ${id}: not found in local state`);
      return;
    }
    
    // Save the previous content in case we need to revert
    const previousContent = block.content;
    
    try {
      // Update local state first (optimistic update)
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
      
      // Save to backend
      console.log(`Updating block ${id} content on backend`);
      await saveBlock({ ...block, content });
    } catch (error) {
      console.error(`Failed to update block ${id} content:`, error);
      
      // Revert local state if the backend update fails
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: previousContent } : b));
      
      // Alert the user
      alert(`Failed to save your changes. Please try again.`);
    }
  };

  const changeBlockType = async (id, type) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, type } : b));
      setActiveMenu(null);
      // Save to backend
      await saveBlock({ ...block, type });
    }
  };

  const toggleBlockStyle = async (id, key) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, [key]: !b[key] } : b));
      setActiveMenu(null);
      // Save to backend
      await saveBlock({ ...block, [key]: !block[key] });
    }
  };

  const setBlockSize = async (id, size) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, size } : b));
      setActiveMenu(null);
      // Save to backend
      await saveBlock({ ...block, size });
    }
  };

  const toggleBulletList = async (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      const currentlyBulleted = hasAnyBullet(block.content);
      let newContent, newList, newNumlist;
      
      if (currentlyBulleted) {
        newContent = (block.content || '').split('\n').map(line => line.startsWith('• ') ? line.slice(2) : line).join('\n');
        newList = false;
        newNumlist = block.numlist;
      } else {
        const stripped = stripListPrefixes(block.content);
        newContent = prefixBullets(stripped);
        newList = true;
        newNumlist = false;
      }
      
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent, list: newList, numlist: newNumlist } : b));
      setActiveMenu(null);
      // Save to backend
      await saveBlock({ ...block, content: newContent, list: newList, numlist: newNumlist });
    }
  };

  const toggleNumberList = async (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      const currentlyNumbered = hasAnyNumber(block.content);
      let newContent, newList, newNumlist;
      
      if (currentlyNumbered) {
        newContent = (block.content || '').split('\n').map(line => line.replace(/^\d+\.\s/, '')).join('\n');
        newList = block.list;
        newNumlist = false;
      } else {
        const stripped = stripListPrefixes(block.content);
        newContent = numberLines(stripped);
        newList = false;
        newNumlist = true;
      }
      
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent, list: newList, numlist: newNumlist } : b));
      setActiveMenu(null);
      // Save to backend
      await saveBlock({ ...block, content: newContent, list: newList, numlist: newNumlist });
    }
  };

  const addBlockAfter = async (id, type = 'TEXT', content = '') => {
    const block = blocks.find(b => b.id === id);
    if (!block) {
      console.error(`Cannot add block after id ${id}: block not found`);
      return;
    }
    
    // If both blocks are empty, just focus the existing one
    if ((block.content || '').trim() === '' && (content || '').trim() === '') {
      setTimeout(() => {
        const el = blockRefs.current[block.id];
        if (el) { el.focus(); setCaretOffset(el, el.textContent.length); }
      }, 10);
      return;
    }
    
    // Store the current space ID for API calls
    const spaceId = currentSpace?.id;
    if (!spaceId) {
      console.error('No active space for adding blocks');
      return;
    }
    
    try {
      console.log(`Creating new block after block ${id}`);
      
      // Calculate the new order - all blocks after this one need their order incremented
      const newOrder = block.order + 1;
      
      // Create the new block on the backend
      const newBlock = await blocksAPI.createBlock({
        type,
        content,
        space_id: spaceId,
        order: newOrder
      });
      
      console.log('New block created successfully:', newBlock);
      
      // Update the local state
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === id);
        if (idx === -1) return prev;
        
        // Insert the new block after the selected one
        const updatedBlocks = [
          ...prev.slice(0, idx + 1), 
          newBlock, 
          ...prev.slice(idx + 1).map(b => ({ ...b, order: b.order + 1 }))
        ];
        
        // Focus on the new block after the DOM updates
        setTimeout(() => {
          const el = blockRefs.current[newBlock.id];
          if (el) { el.focus(); setCaretOffset(el, 0); }
        }, 10);
        
        return updatedBlocks;
      });
      
      // Refresh block order to ensure consistency
      await blocksAPI.refreshBlockOrder(spaceId);
      
    } catch (error) {
      console.error('Failed to create block:', error);
      // If creation fails, reload blocks to ensure frontend state is correct
      await loadBlocksForSpace(currentSpace.id);
    }
  };

  const addBlockAtEnd = async (type = 'TEXT', content = '') => {
    // Check for an empty last block
    const last = blocks[blocks.length - 1];
    if (last && (last.content || '').trim() === '') {
      setTimeout(() => {
        const el = blockRefs.current[last.id];
        if (el) { el.focus(); setCaretOffset(el, el.textContent.length); }
      }, 10);
      return;
    }
    
    // Store the current space ID for API calls
    const spaceId = currentSpace?.id;
    if (!spaceId) {
      console.error('No active space for adding blocks');
      return;
    }
    
    try {
      console.log('Creating new block at end for space:', spaceId);
      
      // Calculate the new order
      const newOrder = (last?.order || 0) + 1;
      
      // Create the block on the backend
      const newBlock = await blocksAPI.createBlock({
        type,
        content,
        space_id: spaceId,
        order: newOrder
      });
      
      console.log('New block created successfully:', newBlock);
      
      // Update the local state
      setBlocks(prev => {
        const updatedBlocks = [...prev, newBlock];
        
        // Focus on the new block
        setTimeout(() => {
          const el = blockRefs.current[newBlock.id];
          if (el) { 
            el.focus(); 
            setCaretOffset(el, content.length); 
          }
        }, 10);
        
        return updatedBlocks;
      });
      
      // Refresh block order to ensure consistency
      await blocksAPI.refreshBlockOrder(spaceId);
      
    } catch (error) {
      console.error('Failed to create block at end:', error);
      // If creation fails, reload blocks to ensure frontend state is correct
      await loadBlocksForSpace(spaceId);
    }
  };

  const deleteBlock = async (id) => {
    // Don't delete if it's the last block remaining
    if (blocks.length <= 1) {
      console.log('Cannot delete the last remaining block');
      return;
    }
    
    // Find the block to delete and get its space ID
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) {
      console.error(`Block with ID ${id} not found`);
      return;
    }
    
    const blockToDelete = blocks[idx];
    const spaceId = blockToDelete.space_id || currentSpace?.id;
    
    if (!spaceId) {
      console.error('No space ID available for block deletion');
      return;
    }
    
    // Store reference to previous block for focus management
    const prevBlock = blocks[Math.max(0, idx - 1)];
    
    try {
      console.log(`Deleting block ${id} from space ${spaceId}`);
      
      // Remove from local state first (optimistic update)
      setBlocks(prev => prev.filter(b => b.id !== id));
      
      // Delete from backend
      const response = await blocksAPI.deleteBlock(id);
      
      // Log success
      console.log('Block deleted successfully:', response);
      
      // Set focus to previous block
      setTimeout(() => {
        const el = blockRefs.current[prevBlock.id];
        if (el) { el.focus(); setCaretOffset(el, el.textContent.length); }
      }, 10);
    } catch (error) {
      console.error('Failed to delete block:', error);
      // If deletion fails, reload blocks to ensure frontend state is correct
      await loadBlocksForSpace(currentSpace.id);
    }
  };

  // Your existing drag and drop handlers (unchanged)
  const onDragStart = (e, id) => {
    dragState.current.draggingId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const onDragOver = (e, overId) => {
    e.preventDefault();
  };

  const onDrop = async (e, dropTargetId) => {
    e.preventDefault();
    const draggingId = dragState.current.draggingId;
    dragState.current = { draggingId: null };
    
    // If no drag operation or dropped on itself, do nothing
    if (!draggingId || draggingId === dropTargetId) return;
    
    // Get the current space ID for API calls
    const spaceId = currentSpace?.id;
    if (!spaceId) {
      console.error('No active space for reordering blocks');
      return;
    }
    
    console.log(`Reordering block ${draggingId} to position after/before ${dropTargetId}`);
    
    try {
      // Update local state first (optimistic update)
      setBlocks(prev => {
        const fromIdx = prev.findIndex(b => b.id === draggingId);
        const toIdx = prev.findIndex(b => b.id === dropTargetId);
        
        if (fromIdx === -1 || toIdx === -1) return prev;
        
        const updated = [...prev];
        const [moved] = updated.splice(fromIdx, 1);
        
        // Calculate the insertion index based on drop position
        const targetEl = blockRefs.current[dropTargetId];
        let insertIdx = toIdx;
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          insertIdx = (e.clientY < midY) ? toIdx : toIdx + 1;
        }
        
        updated.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved);
        
        // Update order values for all blocks
        return updated.map((b, i) => ({ ...b, order: i }));
      });
      
      console.log('Updating block order on backend...');
      
      // Save each block with its new order
      const updatedBlocks = [...blocks].sort((a, b) => a.order - b.order);
      
      // First approach: batch update all block orders
      const updatePromises = updatedBlocks.map(async (block) => {
        try {
          await blocksAPI.updateBlock(block.id, { order: block.order });
        } catch (error) {
          console.error(`Failed to update order for block ${block.id}:`, error);
        }
      });
      
      await Promise.all(updatePromises);
      
      // Second approach: call the refresh endpoint as a backup to ensure consistency
      await blocksAPI.refreshBlockOrder(spaceId);
      console.log('Block order updated on backend');
    } catch (error) {
      console.error('Failed to persist block order:', error);
      // If reordering fails, reload blocks to ensure frontend state is correct
      await loadBlocksForSpace(spaceId);
    }
  };

  // Your existing key handling (unchanged)
  const handleKeyDown = (e, id) => {
    const block = blocks.find(b => b.id === id);
    const el = blockRefs.current[id];
    if (!block || !el) return;

    if (e.key === 'Enter') {
      const bEl = blockRefs.current[id];
      if (!bEl) return;
      const { text, offset, start, lineText } = getLineInfoAtCaret(bEl);
      const currentLineBulleted = lineText.startsWith('• ');
      const currentLineNumbered = /^\d+\.\s/.test(lineText);
      const isEmptyLine = lineText.trim().length === 0;
      if (!currentLineBulleted && !currentLineNumbered) return;
      e.preventDefault();
      if (currentLineBulleted) {
        insertTextAtCaret('\n• ');
        return;
      }
      if (currentLineNumbered) {
        if (isEmptyLine) {
          insertTextAtCaret('\n');
          return;
        }
        const prevCount = text.slice(0, start).split('\n').filter(l => /^\d+\.\s/.test(l)).length;
        const nextNum = prevCount + 1;
        insertTextAtCaret(`\n${nextNum}. `);
        setTimeout(() => {
          const elAfter = blockRefs.current[id];
          if (!elAfter) return;
          const caretAfter = getCaretOffset(elAfter);
          const fixed = renumberLines(normalizeListLines(elAfter.innerText || ''));
          elAfter.innerText = fixed;
          setCaretOffset(elAfter, caretAfter);
        }, 0);
        return;
      }
    }

    if (e.key === 'Backspace') {
      const offset = getCaretOffset(el);
      const text = el.innerText || '';
      const lineStart = getLineStartOffset(text, offset);
      if (offset === lineStart) {
        const nextTwo = text.slice(lineStart, lineStart + 2);
        const nextNumMatch = text.slice(lineStart).match(/^\d+\.\s/);
        if (nextTwo === '• ') {
          e.preventDefault();
          const without = text.slice(0, lineStart) + text.slice(lineStart + 2);
          updateBlockContent(id, without);
          setTimeout(() => setCaretOffset(el, lineStart), 0);
          return;
        } else if (nextNumMatch) {
          e.preventDefault();
          const without = text.slice(0, lineStart) + text.slice(lineStart + nextNumMatch[0].length);
          updateBlockContent(id, without);
          setTimeout(() => {
            setCaretOffset(el, lineStart);
            const caret = getCaretOffset(el);
            el.innerText = renumberLines(normalizeListLines(el.innerText || ''));
            setCaretOffset(el, caret);
          }, 0);
          return;
        }
      }
      if (offset !== 0) return;
      const idx = blocks.findIndex(b => b.id === id);
      if (idx === -1) return;
      if (idx === 0) return;
      e.preventDefault();
      const previous = blocks[idx - 1];
      const prevLen = previous.content.length;
      
      // Update the previous block content
      try {
        // First update our local state
        setBlocks(prev => prev.map((b, i) => {
          if (i === idx - 1) return { ...b, content: b.content + block.content };
          return b;
        }).filter(b => b.id !== id));
        
        // Then update on the backend
        blocksAPI.updateBlock(previous.id, { 
          content: previous.content + block.content 
        }).then(() => {
          // After that's successful, delete the current block
          return blocksAPI.deleteBlock(block.id);
        }).catch(error => {
          console.error('Failed to merge blocks:', error);
          // If merging fails, reload blocks
          loadBlocksForSpace(currentSpace?.id);
        });
      } catch (error) {
        console.error('Error during block merge:', error);
      }
      
      // Set focus to the previous block
      setTimeout(() => {
        const prevEl = blockRefs.current[previous.id];
        if (prevEl) { prevEl.focus(); setCaretOffset(prevEl, prevLen); }
      }, 10);
      return;
    }
  };

  const getPlaceholder = (type) => type === 'HEADING' ? 'Heading' : 'Type / for commands';

  const renderBlock = (block) => {
    const setRef = (el) => { blockRefs.current[block.id] = el; };
    const commonProps = {
      ref: setRef,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onKeyDown: (e) => handleKeyDown(e, block.id),
      onBlur: (e) => updateBlockContent(block.id, e.currentTarget.innerText),
      'data-placeholder': getPlaceholder(block.type),
      className: `block block-${block.type.toLowerCase()}`,
      style: {
        outline: 'none',
        whiteSpace: 'pre-wrap',         // Preserves line breaks
        wordWrap: 'break-word',         // ← Add this line
        overflowWrap: 'break-word',     // ← Add this line
        width: '100%',                  // ← Add this line
        minHeight: '1.5em'
      }
    };
    switch (block.type) {
      case 'HEADING': {
        const headingStyle = {
          ...commonProps.style,
          fontSize: '1.75rem',
          fontWeight: block.bold ? '800' : '700',
          fontStyle: block.italic ? 'italic' : 'normal',
          textDecoration: block.underline ? 'underline' : 'none',
          margin: '0.75em 0 0.25em'
        };
        return <h1 {...commonProps} style={headingStyle}>{block.content}</h1>;
      }
      default:
        {
          const textStyle = {
            ...commonProps.style,
            fontWeight: block.bold ? '700' : '400',
            fontStyle: block.italic ? 'italic' : 'normal',
            textDecoration: block.underline ? 'underline' : 'none',
            fontSize: block.size === 'small' ? '0.9rem' : block.size === 'normal' ? '1.06rem' : block.size === 'large' ? '1.25rem' : undefined
          };
          return <div {...commonProps} style={textStyle}>{block.content}</div>;
        }
    }
  };

  // Show authentication if not logged in
  if (!isAuthenticated) {
    return <AuthContainer onAuthSuccess={handleAuthSuccess} />;
  }

  // Show appropriate UI when no space is selected
  if (!currentSpace) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif',
        padding: '20px'
      }}>
        {isLoadingSpaces ? (
          <div>
            <h2>Loading your spaces...</h2>
            <p>Please wait...</p>
          </div>
        ) : spaces.length === 0 ? (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h2>Welcome to Notion-Style Editor</h2>
            <p>You don't have any spaces yet. Create your first space to get started.</p>
            <div style={{ marginTop: '20px' }}>
              <input 
                type="text" 
                value={newSpaceName} 
                onChange={(e) => setNewSpaceName(e.target.value)}
                placeholder="Enter space name"
                style={{
                  padding: '10px',
                  marginRight: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              <button 
                onClick={() => {
                  if (newSpaceName.trim()) {
                    createNewSpace(newSpaceName.trim());
                    setNewSpaceName('');
                  }
                }}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Create Space
              </button>
            </div>
            <p style={{ marginTop: '20px', color: '#666' }}>
              <small>
                You can create multiple spaces to organize different projects or collaborations.
              </small>
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2>Select a Space</h2>
            <p>Please select one of your spaces or create a new one.</p>
            <div style={{ marginTop: '20px' }}>
              <select 
                onChange={(e) => {
                  const selectedSpace = spaces.find(s => s.id === parseInt(e.target.value));
                  if (selectedSpace) setCurrentSpace(selectedSpace);
                }}
                style={{ 
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  width: '300px',
                  marginBottom: '20px'
                }}
              >
                <option value="">-- Select a Space --</option>
                {spaces.map(space => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
              <div>
                <input 
                  type="text" 
                  value={newSpaceName} 
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Enter new space name"
                  style={{
                    padding: '10px',
                    marginRight: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
                <button 
                  onClick={() => {
                    if (newSpaceName.trim()) {
                      createNewSpace(newSpaceName.trim());
                      setNewSpaceName('');
                    }
                  }}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Create New
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Function to handle the creation of a new space from the form
  const handleCreateSpaceFromPopup = async (e) => {
    // Prevent the default form submission
    e?.preventDefault();
    
    console.log("Creating new space with name:", newSpaceName);
    
    // Check if the space name is not empty
    const trimmedName = newSpaceName.trim();
    if (!trimmedName) {
      console.log("Space name is empty, not submitting");
      return;
    }
    
    try {
      // Show some feedback that we're creating the space
      alert(`Creating space "${trimmedName}"...`);
      
      // Make the API call to create the space
      console.log("Submitting to API...");
      
      // Direct API call using axios to ensure we're using the right endpoint
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_BASE_URL}/spaces/`, 
        { name: trimmedName }, 
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      const newSpace = response.data;
      console.log("API call successful, new space:", newSpace);
      
      // Update the spaces list with the new space
      setSpaces(prev => [...prev, newSpace]);
      
      // Set the new space as the current space
      setCurrentSpace(newSpace);
      
      // Clear the form and close it
      setNewSpaceName('');
      setCreateSpaceOpen(false);
      
      // Show success message
      alert(`Space "${newSpace.name}" created successfully!`);
      
    } catch (error) {
      console.error("Error creating space:", error);
      
      // Show detailed error information
      let errorMessage = "Unknown error";
      if (error.response) {
        // The server responded with a status code outside of 2xx
        errorMessage = `Server error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response from server. Check your network connection.";
        console.error("Request:", error.request);
      } else {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      alert(`Failed to create space: ${errorMessage}`);
    }
  };

  // Main editor interface
  return (
    <>
      
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          height: 100%;
        }
        
        .editor-container { 
          max-width: 900px;
          margin: 0 auto;           
          padding: 50px 10px;       
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; 
          color: rgb(55,53,47); 
          line-height: 1.5;
          position: relative;       /* Add this */
          margin-left: 24px;        /* Add this - pushes content right to make room for controls */
        }
        .block-wrapper { 
          position: relative; 
          padding-left: 0px;
          margin-bottom: 2px; 
        }
        .block-wrapper.menu-open .menu-button { opacity: 1 !important; z-index: 15; }
        .block-wrapper.drag-over-before { box-shadow: inset 0 2px 0 0 #3b82f6; }
        .block-wrapper.drag-over-after { box-shadow: inset 0 -2px 0 0 #3b82f6; }
        .drag-handle { 
          position: absolute; 
          left: -24px;
          top: 4px; 
          width: 16px; 
          height: 24px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #c0c4cc; 
          cursor: grab; 
          user-select: none; 
        }
        .drag-handle:active { cursor: grabbing; }
        .menu-button { 
          position: absolute; 
          left: -24px;
          top: 4px; 
          width: 24px; 
          height: 24px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 3px; 
          cursor: pointer; 
          color: #9ca3af; 
          opacity: 0; 
          transition: opacity .2s; 
          z-index: 15; 
        }
        .block-wrapper:hover .menu-button { opacity: .8; }
        .menu-button:hover { background: #f3f4f6; opacity: 1; }
        .block-menu { position: absolute; left: 24px; top: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.08); min-width: 220px; z-index: 10; }
        
        /* Create space button styles */
        .create-space-button {
          background: #2563eb;
          color: white;
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: background 0.2s;
          border: none;
          font-size: 14px;
          font-weight: bold;
          padding: 0 15px;
        }
        
        .create-space-button:hover {
          background: #1e40af;
        }
        .menu-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; cursor: pointer; font-size: 14px; }
        .menu-item:hover { background: #f3f4f6; }
        .menu-item-left { display: flex; align-items: center; gap: 8px; }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #aaa; font-style: italic; }
        .header { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .space-selector { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; background: white; }
        .user-info { display: flex; align-items: center; gap: 0.5rem; }
        .logout-btn { padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .logout-btn:hover { background: #dc2626; }
        .main-layout { display: flex; height: 100vh; overflow: hidden; }
        .left-sidebar { 
          width: 280px; 
          background: #f8fafc; 
          border-right: 1px solid #e5e7eb; 
          display: flex; 
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 50;
        }
        .editor-area { 
          flex: 1; 
          display: flex; 
          flex-direction: column;
          margin-left: 280px; 
          overflow-y: auto; 
          height: 100vh;
        }
        .members-section { flex: 1; padding: 1rem; overflow-y: auto; }
      `}</style>

      <div className="main-layout">
        {/* Left Sidebar with Space Selector and Members */}
        <div className="left-sidebar">
          {/* Space Selector at the top */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>Spaces</h3>
            <select 
              className="space-selector"
              value={currentSpace?.id || ''} 
              onChange={(e) => {
                const space = spaces.find(s => s.id === parseInt(e.target.value));
                if (space) setCurrentSpace(space);
              }}
              style={{ width: '100%' }}
            >
              {spaces.map(space => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </div>

          {/* Members Section in the remaining space */}
          <div className="members-section">
            <SpaceMembers 
              spaceId={currentSpace?.id}
              currentUser={currentUser}
              onMembersUpdate={(wasSpaceDeleted = false) => {
                // If space was deleted, immediately reset current space and show notification
                if (wasSpaceDeleted) {
                  console.log("Space was deleted, resetting UI");
                  // Reset current space first to trigger UI update
                  setCurrentSpace(null);
                  // Display notification that space was deleted
                  alert("Space has been deleted because you were the owner.");
                  // Then reload spaces list
                  loadUserSpaces();
                  return;
                }
                
                // For other member updates (joining/leaving)
                console.log("Member list updated, refreshing spaces");
                // Reload spaces list
                loadUserSpaces();
                
                // If the user left the current space, check if we still have access
                if (currentUser?.id && currentSpace?.id) {
                  // Check if we're still a member of this space
                  spacesAPI.getSpace(currentSpace.id)
                    .then(() => {
                      // Still have access, do nothing
                      console.log("Still have access to space");
                    })
                    .catch((error) => {
                      console.log("Lost access to space", error);
                      // Lost access, reset current space
                      setCurrentSpace(null);
                    });
                }
              }}
            />
          </div>
          
          {/* Create Space Section at the bottom */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
            {!createSpaceOpen ? (
              // Show button when form is closed
              <button 
                className="create-space-button" 
                onClick={() => {
                  setCreateSpaceOpen(true);
                  // Focus the input after a short delay to ensure it's mounted
                  setTimeout(() => {
                    if (createSpaceInputRef.current) {
                      createSpaceInputRef.current.focus();
                    }
                  }, 10);
                }}
                title="Create New Space"
                aria-label="Create New Space"
                style={{ width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <span style={{ marginRight: '5px' }}>+</span> New Space
              </button>
            ) : (
              // Show inline form when open
              <div className="create-space-form">
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937' }}>Create New Space</h3>
                <form onSubmit={handleCreateSpaceFromPopup}>
                  <input
                    ref={createSpaceInputRef}
                    type="text"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    placeholder="Enter space name"
                    maxLength={50}
                    className="create-space-input"
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      marginBottom: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setCreateSpaceOpen(false)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={!newSpaceName.trim()}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: newSpaceName.trim() ? 'pointer' : 'not-allowed',
                        opacity: newSpaceName.trim() ? 1 : 0.7
                      }}
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="editor-area">
          {/* Header with space name and user info - fixed at top of scrollable area */}
          <div className="header">
            <div className="header-left">
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{currentSpace?.name || 'Select a Space'}</h1>
            </div>
            <div className="user-info">
              <span>Welcome, {currentUser?.username}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Loading indicator for blocks */}
            {isLoadingBlocks && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Loading blocks...</p>
              </div>
            )}

            {/* Main editor */}
            <div
              className="editor-container"
            onClick={(e) => {
              if (e.target.classList && e.target.classList.contains('editor-container')) {
                addBlockAtEnd('TEXT', '');
              }
            }}
          >
            {blocks.map(block => (
              <div
                key={block.id}
                className={`block-wrapper ${activeMenu === block.id ? 'menu-open' : ''}`}
              >
                <div
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => onDragStart(e, block.id)}
                  onDragOver={(e) => onDragOver(e, block.id)}
                  onDrop={(e) => onDrop(e, block.id)}
                  title="Drag to reorder"
                >
                  ⋮⋮
                </div>
                <div className="menu-button" onClick={() => setActiveMenu(activeMenu === block.id ? null : block.id)}>⋮</div>
                {activeMenu === block.id && (
                  <>
                    <div className="block-menu">
                      <div className="menu-item" onClick={() => changeBlockType(block.id, 'TEXT')}>
                        <div className="menu-item-left"><span>📄</span><span>Text</span></div>
                      </div>
                      <div className="menu-item" onClick={() => changeBlockType(block.id, 'HEADING')}>
                        <div className="menu-item-left"><span>📝</span><span>Heading</span></div>
                      </div>
                      <div className="menu-item" onClick={() => toggleBulletList(block.id)}>
                        <div className="menu-item-left"><span>•</span><span>{hasAnyBullet(block.content) ? 'Turn into text' : 'Turn into bulleted list'}</span></div>
                      </div>
                      <div className="menu-item" onClick={() => toggleNumberList(block.id)}>
                        <div className="menu-item-left"><span>1.</span><span>{hasAnyNumber(block.content) ? 'Turn into text' : 'Turn into numbered list'}</span></div>
                      </div>
                      <div className="menu-item" onClick={() => toggleBlockStyle(block.id, 'bold')}>
                        <div className="menu-item-left"><span>🔡</span><span>{block.bold ? 'Unbold' : 'Bold'}</span></div>
                      </div>
                      <div className="menu-item" onClick={() => toggleBlockStyle(block.id, 'italic')}>
                        <div className="menu-item-left"><span>𝑖</span><span>{block.italic ? 'Unitalic' : 'Italic'}</span></div>
                      </div>
                      <div className="menu-item" onClick={() => toggleBlockStyle(block.id, 'underline')}>
                        <div className="menu-item-left"><span>⎁</span><span>{block.underline ? 'Remove underline' : 'Underline'}</span></div>
                      </div>
                      {block.type !== 'HEADING' && (
                        <>
                          <div className="menu-item" onClick={() => setBlockSize(block.id, 'small')}>
                            <div className="menu-item-left"><span>🔎</span><span>Small size{block.size === 'small' ? ' ✓' : ''}</span></div>
                          </div>
                          <div className="menu-item" onClick={() => setBlockSize(block.id, 'normal')}>
                            <div className="menu-item-left"><span>🅝</span><span>Normal size{block.size === 'normal' ? ' ✓' : ''}</span></div>
                          </div>
                          <div className="menu-item" onClick={() => setBlockSize(block.id, 'large')}>
                            <div className="menu-item-left"><span>🔍</span><span>Large size{block.size === 'large' ? ' ✓' : ''}</span></div>
                          </div>
                        </>
                      )}
                      <div className="menu-item" onClick={() => deleteBlock(block.id)}>
                        <div className="menu-item-left"><span>🗑️</span><span>Delete</span></div>
                      </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setActiveMenu(null)} />
                  </>
                )}
                {renderBlock(block)}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;