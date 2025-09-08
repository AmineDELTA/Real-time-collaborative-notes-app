import './services/App.css'
import { useState } from 'react';

function App() {
  const [blocks, setBlocks] = useState([
    { 
      id: 1, 
      type: 'TEXT', 
      content: 'First text block - click to edit',
      space_id: 1,
      order: 0,
      owner_id: 1
    },
    { 
      id: 2, 
      type: 'HEADING', 
      content: 'This is a heading block',
      space_id: 1,
      order: 1,
      owner_id: 1
    }
  ]);

  const [showMenu, setShowMenu] = useState(null); // Track which block menu is open

  const updateBlock = (id, newContent) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, content: newContent } : block
    ));
  };

  const changeBlockType = (id, newType) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, type: newType } : block
    ));
    setShowMenu(null); // Close menu after selection
  };

  const getBlockStyle = (blockType) => {
    const baseStyle = {
      outline: 'none',           
      padding: '4px 0',          
      margin: '0',               
      lineHeight: '1.5',         
      width: '100%',             
      border: 'none',            
      background: 'transparent',
      whiteSpace: 'pre-wrap',    // Preserves line breaks
      wordWrap: 'break-word',    // ← Add word wrapping
      overflowWrap: 'break-word' // ← Force long words to wrap
    };

    switch(blockType) {
      case 'HEADING':
        return { 
          ...baseStyle, 
          fontSize: '28px', 
          fontWeight: '700',
          marginTop: '24px',       
          marginBottom: '4px'      
        };
      case 'BULLET_LIST':
        return { 
          ...baseStyle, 
          fontSize: '16px'
        };
      case 'NUMBERED_LIST':
        return { 
          ...baseStyle, 
          fontSize: '16px'
        };
      default: // TEXT
        return { 
          ...baseStyle, 
          fontSize: '16px',
          marginBottom: '1px'      
        };
    }
  };

  const handleKeyDown = (e, blockId) => {
    const block = blocks.find(b => b.id === blockId);
    const blockIndex = blocks.findIndex(b => b.id === blockId);

    // Handle Enter key differently for different block types
    if (e.key === 'Enter') {
      
      // For BULLET_LIST and NUMBERED_LIST: Check if we want new item or new line
      if (block.type === 'BULLET_LIST' || block.type === 'NUMBERED_LIST') {
        
        // If Shift+Enter or if content is empty, create new list item
        if (e.shiftKey || block.content.trim() === '') {
          e.preventDefault();
          const newBlock = {
            id: Date.now(),
            type: block.type,  // Keep same type
            content: '',
            space_id: 1,
            order: block.order + 1,
            owner_id: 1
          };
          
          const newBlocks = [
            ...blocks.slice(0, blockIndex + 1),
            newBlock,
            ...blocks.slice(blockIndex + 1)
          ];
          
          setBlocks(newBlocks);
          return;
        }
        
        // Regular Enter = new line within same block (default browser behavior)
        // Don't preventDefault, let the browser handle it
      }

      // For TEXT and HEADING: Shift+Enter creates new block, Enter creates new line
      if (block.type === 'TEXT' || block.type === 'HEADING') {
        if (e.shiftKey) {
          e.preventDefault();
          const newBlock = {
            id: Date.now(),
            type: 'TEXT',
            content: '',
            space_id: 1,
            order: block.order + 1,
            owner_id: 1
          };
          
          const newBlocks = [
            ...blocks.slice(0, blockIndex + 1),
            newBlock,
            ...blocks.slice(blockIndex + 1)
          ];
          
          setBlocks(newBlocks);
        }
        // Regular Enter creates new line (default behavior)
      }
    }

    // Backspace: Delete empty blocks (but convert lists to text first)
    if (e.key === 'Backspace' && block.content.trim() === '') {
      e.preventDefault();
      
      // If it's a list and empty, convert to TEXT first
      if (block.type === 'BULLET_LIST' || block.type === 'NUMBERED_LIST') {
        changeBlockType(blockId, 'TEXT');
        return;
      }
      
      // If it's TEXT and empty, delete the block
      if (blocks.length > 1) {
        const updated = blocks.filter(b => b.id !== blockId);
        setBlocks(updated);
      }
    }
  };

  const renderBlockContent = (block) => {
    const baseProps = {
      key: block.id,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e) => updateBlock(block.id, e.target.innerText),
      onKeyDown: (e) => handleKeyDown(e, block.id),
      style: getBlockStyle(block.type)
    };

    switch(block.type) {
      case 'BULLET_LIST':
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            gap: '8px'  // Consistent spacing
          }}>
            <span style={{ 
              fontSize: '16px',
              lineHeight: '2',
              marginTop: '0px',  // Align with text baseline
              color: 'rgb(55, 53, 47)',
              minWidth: '1px'   // Prevent shrinking
            }}>•</span>
            <div {...baseProps} style={{
              ...baseProps.style,
              paddingLeft: '0',  // Remove extra padding since we have gap
              flex: 1           // Take remaining space
            }}>
              {block.content}
            </div>
          </div>
        );
      
      case 'NUMBERED_LIST':
        const blockIndex = blocks.findIndex(b => b.id === block.id);
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span style={{ 
              fontSize: '16px',
              lineHeight: '2',
              marginTop: '0px',
              color: 'rgba(17, 17, 16, 1)',
              minWidth: '1px',
              textAlign: 'left'
            }}>
              {blockIndex + 1}.
            </span>
            <div {...baseProps} style={{
              ...baseProps.style,
              paddingLeft: '0',  // Remove extra padding since we have gap
              flex: 1           // Take remaining space
            }}>
              {block.content}
            </div>
          </div>
        );
      
      default:
        return <div {...baseProps}>{block.content}</div>;
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px',         
      margin: '0 auto',          
      padding: '60px 96px',      
      fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif',
      backgroundColor: '#ffffff',
      minHeight: '100vh',        
      color: 'rgb(55, 53, 47)'   
    }}>
      
      {blocks.map(block => (
        <div 
          key={block.id} 
          style={{ 
            position: 'relative', 
            marginBottom: '2px',
            paddingLeft: '24px' // Space for the three dots
          }}
          onMouseEnter={() => {}} // We'll use this for hover detection
          onMouseLeave={() => {}} 
        >
          {/* Three Dots Menu Button */}
          <div
            onClick={() => setShowMenu(showMenu === block.id ? null : block.id)}
            style={{
              position: 'absolute',
              left: '-6px',
              top: '4px',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#9ca3af',
              borderRadius: '4px',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            ⋮
          </div>

          {/* Dropdown Menu */}
          {showMenu === block.id && (
            <div style={{
              position: 'absolute',
              left: '20px',
              top: '0px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              minWidth: '200px',
              padding: '8px 0'
            }}>
              {[
                { value: 'TEXT', label: 'Text', icon: '📄' },
                { value: 'HEADING', label: 'Heading', icon: '📝' },
                { value: 'BULLET_LIST', label: 'Bullet List', icon: '•' },
                { value: 'NUMBERED_LIST', label: 'Numbered List', icon: '1.' }
              ].map(option => (
                <div
                  key={option.value}
                  onClick={() => changeBlockType(block.id, option.value)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: block.type === option.value ? '#f3f4f6' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = block.type === option.value ? '#f3f4f6' : 'transparent';
                  }}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          )}
          
          {renderBlockContent(block)}
        </div>
      ))}
    </div>
  );
}

export default App;