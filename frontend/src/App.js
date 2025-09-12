import './services/App.css'
import { useState, useRef, useEffect } from 'react';
import AuthContainer from './components/AuthContainer';
import { apiUtils, spacesAPI, blocksAPI, authAPI } from './services/api';
import SpaceMembers from './components/SpaceMembers';

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

  // Check authentication on app start
  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      handleAuthSuccess();
    }
  }, []);

  // Load blocks when space changes
  useEffect(() => {
    if (currentSpace) {
      loadBlocksForSpace(currentSpace.id);
    }
  }, [currentSpace]);

  // Auto-focus last block (your existing code)
  useEffect(() => {
    const last = blocks[blocks.length - 1];
    if (last && blockRefs.current[last.id]) {
      setTimeout(() => blockRefs.current[last.id].focus(), 10);
    }
  }, [blocks.length]);

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
      setSpaces(userSpaces);
      
      // Auto-select first space if available
      if (userSpaces.length > 0 && !currentSpace) {
        setCurrentSpace(userSpaces[0]);
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  const createNewSpace = async (spaceName) => {
    try {
      const newSpace = await spacesAPI.createSpace({ name: spaceName });
      setSpaces(prev => [...prev, newSpace]);
      setCurrentSpace(newSpace);
      return newSpace;
    } catch (error) {
      console.error('Failed to create space:', error);
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
        // Update existing block
        await blocksAPI.updateBlock(blockData.id, blockData);
      } else {
        // Create new block
        const newBlock = await blocksAPI.createBlock({
          ...blockData,
          space_id: currentSpace.id
        });
        return newBlock;
      }
    } catch (error) {
      console.error('Failed to save block:', error);
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
    if (block) {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
      // Save to backend
      await saveBlock({ ...block, content });
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
    if (!block) return;
    
    if ((block.content || '').trim() === '' && (content || '').trim() === '') {
      setTimeout(() => {
        const el = blockRefs.current[block.id];
        if (el) { el.focus(); setCaretOffset(el, el.textContent.length); }
      }, 10);
      return;
    }
    
    try {
      const newBlock = await blocksAPI.createBlock({
        type,
        content,
        space_id: currentSpace.id,
        order: block.order + 1
      });
      
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === id);
        const next = [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)];
        setTimeout(() => {
          const el = blockRefs.current[newBlock.id];
          if (el) { el.focus(); setCaretOffset(el, 0); }
        }, 10);
        return next;
      });
    } catch (error) {
      console.error('Failed to create block:', error);
    }
  };

  const addBlockAtEnd = async (type = 'TEXT', content = '') => {
    const last = blocks[blocks.length - 1];
    if (last && (last.content || '').trim() === '') {
      setTimeout(() => {
        const el = blockRefs.current[last.id];
        if (el) { el.focus(); setCaretOffset(el, el.textContent.length); }
      }, 10);
      return;
    }
    
    try {
      const newBlock = await blocksAPI.createBlock({
        type,
        content,
        space_id: currentSpace.id,
        order: (last?.order || 0) + 1
      });
      
      setBlocks(prev => {
        const next = [...prev, newBlock];
        setTimeout(() => {
          const el = blockRefs.current[newBlock.id];
          if (el) { el.focus(); setCaretOffset(el, newBlock.content.length); }
        }, 10);
        return next;
      });
    } catch (error) {
      console.error('Failed to create block:', error);
    }
  };

  const deleteBlock = async (id) => {
    if (blocks.length <= 1) return;
    
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    
    const prevBlock = blocks[Math.max(0, idx - 1)];
    
    try {
      await blocksAPI.deleteBlock(id);
      setBlocks(prev => prev.filter(b => b.id !== id));
      setTimeout(() => {
        const el = blockRefs.current[prevBlock.id];
        if (el) { el.focus(); setCaretOffset(el, el.textContent.length); }
      }, 10);
    } catch (error) {
      console.error('Failed to delete block:', error);
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

  const onDrop = (e, dropTargetId) => {
    e.preventDefault();
    const draggingId = dragState.current.draggingId;
    dragState.current = { draggingId: null };
    if (!draggingId || draggingId === dropTargetId) return;
    setBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === draggingId);
      const toIdx = prev.findIndex(b => b.id === dropTargetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      const targetEl = blockRefs.current[dropTargetId];
      let insertIdx = toIdx;
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        insertIdx = (e.clientY < midY) ? toIdx : toIdx + 1;
      } else {
        insertIdx = toIdx;
      }
      updated.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved);
      return updated.map((b, i) => ({ ...b, order: i }));
    });
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
      setBlocks(prev => prev.map((b, i) => {
        if (i === idx - 1) return { ...b, content: b.content + block.content };
        return b;
      }).filter(b => b.id !== id));
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
        whiteSpace: 'pre-wrap',
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

  // Show loading if no space selected
  if (!currentSpace) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif'
      }}>
        <div>
          <h2>Loading your spaces...</h2>
          {isLoadingSpaces && <p>Please wait...</p>}
        </div>
      </div>
    );
  }

  // Main editor interface
  return (
    <>
      <style>{`
        .editor-container { max-width: 700px; margin: 0 auto; padding: 60px 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; color: rgb(55,53,47); line-height: 1.5; }
        .block-wrapper { position: relative; padding-left: 24px; margin-bottom: 2px; }
        .block-wrapper.menu-open .menu-button { opacity: 1 !important; z-index: 15; }
        .block-wrapper.drag-over-before { box-shadow: inset 0 2px 0 0 #3b82f6; }
        .block-wrapper.drag-over-after { box-shadow: inset 0 -2px 0 0 #3b82f6; }
        .drag-handle { position: absolute; left: -18px; top: 4px; width: 16px; height: 24px; display: flex; align-items: center; justify-content: center; color: #c0c4cc; cursor: grab; user-select: none; }
        .drag-handle:active { cursor: grabbing; }
        .menu-button { position: absolute; left: 0; top: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 3px; cursor: pointer; color: #9ca3af; opacity: 0; transition: opacity .2s; z-index: 15; }
        .block-wrapper:hover .menu-button { opacity: .8; }
        .menu-button:hover { background: #f3f4f6; opacity: 1; }
        .block-menu { position: absolute; left: 24px; top: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.08); min-width: 220px; z-index: 10; }
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
        .main-layout { display: flex; height: 100vh; }
        .left-sidebar { width: 280px; background: #f8fafc; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; }
        .editor-area { flex: 1; display: flex; flex-direction: column; }
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
              onMembersUpdate={() => {
                loadUserSpaces();
              }}
            />
          </div>
        </div>

        <div className="editor-area">
          {/* Header with space name and user info */}
          <div className="header">
            <div className="header-left">
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{currentSpace?.name || 'Select a Space'}</h1>
            </div>
            <div className="user-info">
              <span>Welcome, {currentUser?.username}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>

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
    </>
  );
}

export default App;