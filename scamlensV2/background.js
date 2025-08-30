// Enhanced phishing detection with multiple services and ACCC priority
const SERVICES = {
  // Primary: ACCC/Scamwatch (highest priority)
  scamwatch: {
    url: 'https://www.scamwatch.gov.au/about-us/news-and-alerts?f%5B0%5D=news_type%3A2',
    priority: 1,
    enabled: true
  },
  
  // Secondary: URLHaus (community blocklist)
  urlhaus: {
    url: 'https://urlhaus.abuse.ch/downloads/json/',
    priority: 2,
    enabled: true
  },
  
  // Additional: PhishTank (community-driven)
  phishtank: {
    url: 'https://data.phishtank.com/data/online-valid.json',
    priority: 3,
    enabled: true
  },
  
  // Additional: OpenPhish
  openphish: {
    url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt',
    priority: 4,
    enabled: true,
    description: 'Automated phishing detection feed from GitHub'
  },
  
  // Additional: Google Safe Browsing (if available)
  safebrowsing: {
    url: 'https://safebrowsing.googleapis.com/v4/threatLists:fetch',
    priority: 5,
    enabled: false, // Requires API key
    description: 'Google\'s comprehensive threat database'
  },
  
  // Additional: Cisco Talos Intelligence
  talos: {
    url: 'https://talosintelligence.com/documents/ip-blacklist',
    priority: 6,
    enabled: true,
    description: 'Cisco\'s threat intelligence feed'
  },
  
  // Additional: Emerging Threats
  emergingthreats: {
    url: 'https://rules.emergingthreats.net/open/suricata/rules/',
    priority: 7,
    enabled: true,
    description: 'Community-maintained threat rules'
  }
};

// Cache for all services
let serviceCache = {};

async function fetchServiceData(serviceName, serviceConfig) {
  try {
    const response = await fetch(serviceConfig.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    let data;
    if (serviceName === 'scamwatch') {
      // Parse Scamwatch HTML for alerts
      const html = await response.text();
      data = parseScamwatchAlerts(html);
    } else if (serviceName === 'urlhaus') {
      const json = await response.json();
      data = (json.urls || []).map(u => u.url).filter(Boolean);
    } else if (serviceName === 'phishtank') {
      const json = await response.json();
      data = json.map(entry => entry.url).filter(Boolean);
    } else if (serviceName === 'openphish') {
      const text = await response.text();
      data = text.split('\n').filter(line => line.trim() && line.startsWith('http'));
    } else if (serviceName === 'talos') {
      const text = await response.text();
      // Parse Talos IP blacklist
      data = text.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
    } else if (serviceName === 'emergingthreats') {
      const text = await response.text();
      // Parse Emerging Threats rules for malicious domains/IPs
      const domainRegex = /alert\s+.*\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const matches = [];
      let match;
      while ((match = domainRegex.exec(text)) !== null) {
        matches.push(match[1]);
      }
      data = [...new Set(matches)]; // Remove duplicates
    }
    
    return data;
  } catch (error) {
    console.warn(`Failed to fetch ${serviceName}:`, error);
    return null;
  }
}

function parseScamwatchAlerts(html) {
  // Extract scam alerts from Scamwatch HTML
  const alerts = [];
  const alertRegex = /<h3[^>]*>([^<]+)<\/h3>/g;
  let match;
  
  while ((match = alertRegex.exec(html)) !== null) {
    const title = match[1].trim();
    if (title.toLowerCase().includes('scam alert:')) {
      alerts.push(title.replace('Scam alert:', '').trim());
    }
  }
  
  return alerts;
}

async function refreshAllFeeds() {
  console.log('🔄 Refreshing all phishing detection feeds...');
  
  const results = {};
  
  // Fetch from all enabled services in priority order
  const sortedServices = Object.entries(SERVICES)
    .filter(([_, config]) => config.enabled)
    .sort((a, b) => a[1].priority - b[1].priority);
  
  for (const [serviceName, serviceConfig] of sortedServices) {
    console.log(`📡 Fetching from ${serviceName}...`);
    const data = await fetchServiceData(serviceName, serviceConfig);
    
    if (data) {
      results[serviceName] = {
        data: data,
        timestamp: Date.now(),
        priority: serviceConfig.priority
      };
      console.log(`✅ ${serviceName}: ${data.length} items`);
    } else {
      console.log(`❌ ${serviceName}: failed`);
    }
  }
  
  // Store results with priority information
  await chrome.storage.local.set({ 
    serviceCache: results,
    lastFeedUpdate: Date.now()
  });
  
  console.log('🎯 Feed refresh complete');
  
  // Notify about the update
  await notifyFeedUpdate(results);
  
  return results;
}

// Enhanced URL checking with priority-based scoring
async function checkUrlsWithPriority(urls) {
  const { serviceCache = {} } = await chrome.storage.local.get(['serviceCache']);
  
  const results = {
    flagged: [],
    scores: {},
    details: {}
  };
  
  for (const url of urls) {
    let totalScore = 0;
    let flags = [];
    
    // Check each service in priority order
    for (const [serviceName, serviceData] of Object.entries(serviceCache)) {
      if (!serviceData.data) continue;
      
      const priority = serviceData.priority;
      const isMatch = serviceData.data.some(pattern => {
        if (typeof pattern === 'string') {
          return url.includes(pattern) || pattern.includes(url);
        }
        return false;
      });
      
      if (isMatch) {
        // Higher priority services get higher scores
        const score = (5 - priority) * 10; // Priority 1 = 40 points, Priority 4 = 10 points
        totalScore += score;
        flags.push(`${serviceName}:${score}`);
      }
    }
    
    if (totalScore > 0) {
      results.flagged.push(url);
      results.scores[url] = totalScore;
      results.details[url] = flags;
    }
  }
  
  // Sort by score (highest first)
  results.flagged.sort((a, b) => results.scores[b] - results.scores[a]);
  
  return results;
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 ScamLens installed - initializing feeds...');
  console.log('⏰ Auto-refresh will happen every 14 hours (840 minutes)');
  refreshAllFeeds();
});

// Set up periodic refresh (every 14 hours)
chrome.alarms.create('refreshFeeds', { periodInMinutes: 840 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshFeeds') {
    console.log('⏰ Auto-refresh triggered by alarm - updating all feeds...');
    console.log('🕐 Current time:', new Date().toLocaleString());
    refreshAllFeeds();
  }
});

// Add notification when feeds are updated
async function notifyFeedUpdate(results) {
  try {
    // Create a simple notification
    const totalItems = Object.values(results).reduce((sum, service) => {
      return sum + (service.data ? service.data.length : 0);
    }, 0);
    
    console.log(`📢 Feed update notification: ${totalItems} total threat items loaded`);
    console.log(`🕐 Last update: ${new Date().toLocaleString()}`);
    
    // Store update info for popup display
    await chrome.storage.local.set({ 
      lastFeedUpdate: Date.now(),
      feedUpdateCount: (await chrome.storage.local.get(['feedUpdateCount'])).feedUpdateCount + 1 || 1
    });
    
    // Log each service status
    Object.entries(results).forEach(([serviceName, serviceData]) => {
      if (serviceData && serviceData.data) {
        console.log(`✅ ${serviceName}: ${serviceData.data.length} items loaded at ${new Date(serviceData.timestamp).toLocaleString()}`);
      } else {
        console.log(`❌ ${serviceName}: Failed to load data`);
      }
    });
    
    // Show user notification
    await showFeedUpdateNotification(totalItems, results);
    
    // Log to persistent storage for documentation
    await logFeedUpdateToStorage(results);
    
  } catch (error) {
    console.error('Failed to notify feed update:', error);
  }
}

// Show user notification about feed updates
async function showFeedUpdateNotification(totalItems, results) {
  try {
    // Create notification
    const notification = {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🔄 ScamLens Pro - Feeds Updated',
      message: `Updated ${totalItems} threat items from ${Object.keys(results).length} services`,
      priority: 1
    };
    
    // Show notification if supported
    if (chrome.notifications) {
      await chrome.notifications.create('feed-update', notification);
    }
    
    // Also show in-page notification for active tabs
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (totalItems, serviceCount) => {
            // Create in-page notification
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed; top: 20px; right: 20px; z-index: 10000;
              background: #4caf50; color: white; padding: 15px; border-radius: 8px;
              font-family: Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              animation: slideIn 0.3s ease-out;
            `;
            notification.innerHTML = `
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">🔄</span>
                <div>
                  <strong>ScamLens Pro Updated!</strong><br>
                  ${totalItems} threat items from ${serviceCount} services
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">
                  ✕
                </button>
              </div>
            `;
            
            // Add CSS animation
            const style = document.createElement('style');
            style.textContent = `
              @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => notification.remove(), 5000);
          },
          args: [totalItems, Object.keys(results).length]
        });
      } catch (error) {
        // Tab might not support scripting
        console.log(`Could not show notification in tab ${tab.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Failed to show feed update notification:', error);
  }
}

// Log feed updates to persistent storage for documentation
async function logFeedUpdateToStorage(results) {
  try {
    const updateLog = {
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      totalItems: Object.values(results).reduce((sum, service) => {
        return sum + (service.data ? service.data.length : 0);
      }, 0),
      services: Object.entries(results).map(([name, data]) => ({
        name: name,
        itemCount: data.data ? data.data.length : 0,
        status: data.data ? 'success' : 'failed',
        timestamp: data.timestamp
      }))
    };
    
    // Get existing logs
    const { feedUpdateLogs = [] } = await chrome.storage.local.get(['feedUpdateLogs']);
    
    // Add new log (keep last 50 updates)
    feedUpdateLogs.push(updateLog);
    if (feedUpdateLogs.length > 50) {
      feedUpdateLogs.shift(); // Remove oldest
    }
    
    // Store updated logs
    await chrome.storage.local.set({ feedUpdateLogs });
    
    console.log('📝 Feed update logged to storage for documentation');
    
  } catch (error) {
    console.error('Failed to log feed update:', error);
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'CHECK_URLS') {
    const results = await checkUrlsWithPriority(msg.urls);
    sendResponse(results);
  } else if (msg.type === 'GET_FEED_STATUS') {
    const { serviceCache, lastFeedUpdate } = await chrome.storage.local.get(['serviceCache', 'lastFeedUpdate']);
    sendResponse({ serviceCache, lastFeedUpdate });
  } else if (msg.type === 'REFRESH_FEEDS') {
    const results = await refreshAllFeeds();
    sendResponse(results);
  }
});

// Manual refresh endpoint
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'MANUAL_REFRESH') {
    const results = await refreshAllFeeds();
    sendResponse(results);
  }
});
