(async function () {
  // Check overall feed status
  const { urlhaus_ts, lastScamReport, lastFeedUpdate, feedUpdateCount } = await chrome.storage.local.get([
    'urlhaus_ts', 'lastScamReport', 'lastFeedUpdate', 'feedUpdateCount'
  ]);
  
  // Update status text
  const statusText = document.getElementById('status-text');
  if (lastFeedUpdate) {
    const lastUpdate = new Date(lastFeedUpdate);
    const now = new Date();
    const diffMinutes = Math.round((now - lastUpdate) / (1000 * 60));
    
    if (diffMinutes < 1) {
      statusText.textContent = `✅ Feeds updated ${diffMinutes} minutes ago`;
    } else if (diffMinutes < 60) {
      statusText.textContent = `✅ Feeds updated ${diffMinutes} minutes ago`;
    } else if (diffMinutes < 1440) { // 24 hours
      const diffHours = Math.round(diffMinutes / 60);
      statusText.textContent = `✅ Feeds updated ${diffHours} hours ago`;
    } else {
      const diffDays = Math.round(diffMinutes / 1440);
      statusText.textContent = `⚠️ Feeds updated ${diffDays} days ago`;
    }
  } else {
    statusText.textContent = '🔄 Feeds refreshing...';
  }
  
  // Show auto-refresh timing
  updateAutoRefreshInfo(lastFeedUpdate, feedUpdateCount);
  
  // Check individual service statuses
  await checkServiceStatuses();
  
  // Show last scam report if available
  if (lastScamReport) {
    const reportInfo = document.createElement('div');
    reportInfo.style.cssText = 'margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 12px;';
    reportInfo.innerHTML = `📝 Last report: ${new Date(lastScamReport.timestamp).toLocaleDateString()}`;
    document.getElementById('last').appendChild(reportInfo);
  }
})();

// Show auto-refresh timing information
function updateAutoRefreshInfo(lastFeedUpdate, feedUpdateCount) {
  const nextRefreshElement = document.getElementById('next-refresh');
  const updateCountElement = document.getElementById('update-count');
  
  if (nextRefreshElement && updateCountElement) {
    // Calculate next refresh time (every 14 hours = 840 minutes)
    const now = new Date();
    const lastUpdate = lastFeedUpdate ? new Date(lastFeedUpdate) : now;
    const nextRefresh = new Date(lastUpdate.getTime() + (840 * 60 * 1000)); // 840 minutes
    
    const timeUntilNext = nextRefresh - now;
    const minutesUntilNext = Math.round(timeUntilNext / (1000 * 60));
    
    if (minutesUntilNext > 0) {
      if (minutesUntilNext < 60) {
        nextRefreshElement.textContent = `⏰ Next auto-refresh: ${minutesUntilNext} minutes`;
      } else {
        const hoursUntilNext = Math.round(minutesUntilNext / 60);
        nextRefreshElement.textContent = `⏰ Next auto-refresh: ${hoursUntilNext} hours`;
      }
    } else {
      nextRefreshElement.textContent = `⏰ Next auto-refresh: Due now`;
    }
    
    // Show update count
    updateCountElement.textContent = `📊 Total updates: ${feedUpdateCount || 0}`;
  }
}

// Check the status of each phishing detection service
async function checkServiceStatuses() {
  try {
    // Get service cache from background script
    const response = await chrome.runtime.sendMessage({ type: 'GET_FEED_STATUS' });
    
    if (response && response.serviceCache) {
      const services = response.serviceCache;
      
      // Update each service status
      updateServiceStatus('accc-status', services.accc, 'ACCC Rules');
      updateServiceStatus('scamwatch-status', services.scamwatch, 'Scamwatch');
      updateServiceStatus('urlhaus-status', services.urlhaus, 'URLHaus');
      updateServiceStatus('phishtank-status', services.phishtank, 'PhishTank');
      updateServiceStatus('openphish-status', services.openphish, 'OpenPhish');
      updateServiceStatus('talos-status', services.talos, 'Cisco Talos');
      updateServiceStatus('emergingthreats-status', services.emergingthreats, 'Emerging Threats');
    } else {
      // If no cache, show all services as refreshing
      setAllServicesStatus('🔄 Refreshing...', 'checking');
    }
  } catch (error) {
    console.error('Failed to check service statuses:', error);
    setAllServicesStatus('❌ Error', 'error');
  }
}

// Update individual service status
function updateServiceStatus(elementId, serviceData, serviceName) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (serviceData && serviceData.data) {
    const itemCount = Array.isArray(serviceData.data) ? serviceData.data.length : 'Unknown';
    const timestamp = serviceData.timestamp ? new Date(serviceData.timestamp) : null;
    
    if (timestamp) {
      const now = new Date();
      const diffHours = Math.round((now - timestamp) / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        element.textContent = `✅ ${itemCount} items (${Math.round((now - timestamp) / (1000 * 60))}m ago)`;
        element.className = 'service-status active';
      } else if (diffHours < 24) {
        element.textContent = `✅ ${itemCount} items (${diffHours}h ago)`;
        element.className = 'service-status active';
      } else {
        element.textContent = `⚠️ ${itemCount} items (${Math.round(diffHours / 24)}d ago)`;
        element.className = 'service-status warning';
      }
    } else {
      element.textContent = `✅ ${itemCount} items`;
      element.className = 'service-status active';
    }
  } else {
    element.textContent = '❌ Not available';
    element.className = 'service-status error';
  }
}

// Set all services to the same status
function setAllServicesStatus(text, className) {
  const serviceIds = [
    'accc-status', 'scamwatch-status', 'urlhaus-status', 
    'phishtank-status', 'openphish-status', 'talos-status', 'emergingthreats-status'
  ];
  
  serviceIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
      element.className = `service-status ${className}`;
    }
  });
}

// Button event listeners
document.getElementById('rescan').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => location.reload() });
  window.close();
};

document.getElementById('refresh-feeds').onclick = async () => {
  try {
    // Show refreshing status
    setAllServicesStatus('🔄 Refreshing...', 'checking');
    
    // Send refresh message to background script
    const response = await chrome.runtime.sendMessage({ type: 'REFRESH_FEEDS' });
    
    if (response) {
      // Re-check service statuses after refresh
      setTimeout(checkServiceStatuses, 1000);
    }
  } catch (error) {
    console.error('Failed to refresh feeds:', error);
    setAllServicesStatus('❌ Refresh failed', 'error');
  }
};

document.getElementById('view-logs').onclick = async () => {
  try {
    const logsSection = document.getElementById('feed-logs');
    const logsContainer = document.getElementById('logs-container');
    
    if (logsSection.style.display === 'none') {
      // Show logs
      const { feedUpdateLogs = [] } = await chrome.storage.local.get(['feedUpdateLogs']);
      
      if (feedUpdateLogs.length > 0) {
        logsContainer.innerHTML = feedUpdateLogs.slice(-5).reverse().map(log => `
          <div class="log-entry" style="background: #f8f9fa; padding: 8px; margin: 4px 0; border-radius: 4px; font-size: 11px;">
            <strong>${log.date}</strong><br>
            📊 ${log.totalItems} items from ${log.services.length} services<br>
            ${log.services.map(s => `${s.name}: ${s.itemCount} (${s.status})`).join(', ')}
          </div>
        `).join('');
      } else {
        logsContainer.innerHTML = '<div style="color: #666; font-style: italic;">No feed updates logged yet</div>';
      }
      
      logsSection.style.display = 'block';
      document.getElementById('view-logs').textContent = '📊 Hide Logs';
    } else {
      // Hide logs
      logsSection.style.display = 'none';
      document.getElementById('view-logs').textContent = '📊 View Logs';
    }
  } catch (error) {
    console.error('Failed to view logs:', error);
  }
};

document.getElementById('report').onclick = () => {
          try {
          chrome.tabs.create({ url: 'https://portal.scamwatch.gov.au/report-a-scam/' });
          console.log('✅ Opened Scamwatch portal from popup');
        } catch (error) {
          console.error('❌ Failed to open portal from popup:', error);
          // Fallback: open in same tab
          window.open('https://portal.scamwatch.gov.au/report-a-scam/', '_blank');
        }
  window.close();
};

document.getElementById('settings').onclick = () => {
  chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  window.close();
};
