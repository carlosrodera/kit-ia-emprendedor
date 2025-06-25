# Changelog - Kit IA Emprendedor Extension

## [0.2.0] - 2025-01-25

### 🎯 UX/UI Major Improvements

#### ✅ Fixed Issues
- **Fixed favorites system**: GPT ID now properly passed, favorites work correctly
- **Fixed GPT URLs**: All GPTs now use real ChatGPT URLs instead of prompts
- **Fixed floating button**: Remains visible after closing sidebar
- **Fixed clipboard API**: Added fallback mechanism for restricted contexts
- **Fixed resize functionality**: Improved stability and cross-origin handling

#### 🆕 New Features
- **Dual GPT opening modes**:
  - ⚡ "Usar" button: Opens GPT in current tab
  - 🔗 "New tab" button: Opens GPT in new tab
- **View toggle**: Switch between grid (cards) and list views
- **Responsive tabs**: Tabs now adapt to narrow widths with emoji shortcuts
- **Create prompts modal**: Fully functional prompt creation with form validation
- **Toast notifications**: Real-time feedback for all user actions
- **Official GPT badges**: Visual indicators for verified GPTs

#### 🎨 UI/UX Enhancements
- **Responsive design**: All components now adapt to sidebar width changes
- **Compact tabs**: Use emoji shortcuts (⭐ Fav, 📅 Rec, 📝 Mis) for narrow views
- **Improved card design**: Removed confusing "copy" buttons, cleaner actions
- **List view**: Compact horizontal layout for GPTs
- **Better button icons**: Clear Enter and external link icons
- **Modal system**: Professional modal dialogs for prompt creation

#### 🔧 Technical Improvements
- **Better error handling**: Comprehensive try-catch blocks
- **Improved resize**: Respects min/max width constraints
- **Navigation support**: Both same-tab and new-tab navigation
- **State management**: Better view state persistence
- **Performance**: Optimized DOM manipulation and event handling

### 📱 Responsive Features
- **Mobile-first**: All components work from 320px width
- **Adaptive tabs**: Horizontal scroll for narrow sidebars
- **Flexible grid**: Cards adjust size based on available space
- **Touch-friendly**: Appropriate button sizes for mobile

### 🛠️ Architecture
- **Component separation**: Clear separation of concerns
- **Event handling**: Robust message passing between iframe and parent
- **Storage integration**: Proper Chrome Storage API usage
- **Fallback mechanisms**: Multiple fallbacks for restricted environments

### 🚀 GPT Collection
Updated to include real ChatGPT official GPTs:
- **ChatGPT**: Main conversation model
- **DALL-E**: Image generation
- **Code Interpreter**: Programming assistance
- **GPT-4**: Advanced reasoning
- **Web Browsing**: Internet-enabled ChatGPT

---

## [0.1.0] - 2025-01-21

### Initial Release
- Basic extension structure
- Popup and sidebar functionality
- Service worker implementation
- Mock data integration
- Basic authentication flow