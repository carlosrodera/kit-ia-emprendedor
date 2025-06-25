/**
 * Kit IA Emprendedor - Popup Controller
 */

document.getElementById('open-panel').addEventListener('click', async () => {
  // Obtener la ventana actual
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Abrir el side panel
  chrome.sidePanel.open({ windowId: tab.windowId });
  
  // Cerrar el popup
  window.close();
});