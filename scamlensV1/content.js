// ScamLens Pro - Simple Working Banner System
let RULES = [];
let SCAMWATCH_ALERTS = [];

// Load rules and alerts
async function loadRules() {
  try {
    console.log('📚 Loading rules...');
    
    // Load ACCC rules
    const acccResponse = await fetch(chrome.runtime.getURL('rules/accc_rules.json'));
    RULES = await acccResponse.json();
    console.log(`✅ Loaded ${RULES.length} ACCC rules`);
    
    // Load Scamwatch alerts
    const alertsResponse = await fetch(chrome.runtime.getURL('rules/scamwatch_alerts.json'));
    SCAMWATCH_ALERTS = await alertsResponse.json();
    console.log(`✅ Loaded ${SCAMWATCH_ALERTS.alerts?.length || 0} Scamwatch alerts`);
    
  } catch (error) {
    console.error('❌ Failed to load rules:', error);
    RULES = [];
    SCAMWATCH_ALERTS = [];
  }
}

// Get visible text from page
function getVisibleText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let text = '', node;
  while (node = walker.nextNode()) {
    const content = node.nodeValue.trim();
    if (content) text += ' ' + content;
  }
  return text.toLowerCase();
}

// Scan text against rules
function scanText(text) {
  const hits = [];
  
  // Scan ACCC rules
  for (const rule of RULES) {
    try {
      if (rule.pattern && rule.why) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(text)) {
          hits.push({
            id: rule.id,
            pattern: rule.pattern,
            severity: rule.severity || 'med',
            why: rule.why,
            source: 'ACCC',
            learnMore: rule.learn_more
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Invalid regex pattern:', rule.pattern, error);
    }
  }
  
  // Scan Scamwatch alerts
  if (SCAMWATCH_ALERTS.alerts) {
    for (const alert of SCAMWATCH_ALERTS.alerts) {
      try {
        if (alert.pattern && alert.why) {
          const regex = new RegExp(alert.pattern, 'i');
          if (regex.test(text)) {
            hits.push({
              id: alert.id,
              pattern: alert.pattern,
              severity: alert.severity || 'med',
              why: alert.why,
              source: 'Scamwatch',
              learnMore: alert.learn_more
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Invalid regex pattern in alert:', alert.pattern, error);
      }
    }
  }
  
  console.log(`🔍 Found ${hits.length} scam patterns`);
  return hits;
}

// Show banner
function showBanner(hits) {
  if (document.getElementById('scamlens-banner')) return;
  
  // Determine risk level
  let riskLevel = 'green';
  if (hits.some(h => h.severity === 'high')) {
    riskLevel = 'red';
  } else if (hits.length > 0) {
    riskLevel = 'amber';
  }
  
  // Create banner
  const banner = document.createElement('div');
  banner.id = 'scamlens-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    background: ${riskLevel === 'red' ? '#f44336' : riskLevel === 'amber' ? '#ff9800' : '#4caf50'};
    color: white;
    padding: 15px;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  
  // Banner content
  const icon = riskLevel === 'red' ? '🚨' : riskLevel === 'amber' ? '⚠️' : '✅';
  const title = riskLevel === 'red' ? 'High-Risk Scam Detected' : 
                riskLevel === 'amber' ? 'Possible Scam Detected' : 
                'No Scam Signals';
  
  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
      <div>
        <h2 style="margin: 0 0 10px 0; font-size: 18px;">${icon} ${title}</h2>
        <div style="font-size: 14px; margin-bottom: 10px;">
          Found ${hits.length} suspicious pattern${hits.length !== 1 ? 's' : ''} on this page
        </div>
        <div style="font-size: 12px; opacity: 0.9;">
          ${hits.map(hit => `• [${hit.source}] ${hit.why}`).join('<br>')}
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="scamlens-report" style="
          background: white; 
          color: ${riskLevel === 'red' ? '#f44336' : riskLevel === 'amber' ? '#ff9800' : '#4caf50'}; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer; 
          font-weight: bold;
        ">📝 Report</button>
        <button id="scamlens-close" style="
          background: transparent; 
          color: white; 
          border: 1px solid white; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer;
        ">✕ Close</button>
      </div>
    </div>
  `;
  
  // Add banner to page
  document.body.prepend(banner);
  document.body.style.paddingTop = '100px';
  
  // Event listeners
  document.getElementById('scamlens-close').onclick = () => {
    banner.remove();
    document.body.style.paddingTop = '';
  };
  
  document.getElementById('scamlens-report').onclick = () => {
    try {
      chrome.tabs.create({ 
        url: 'https://portal.scamwatch.gov.au/report-a-scam/' 
      });
    } catch (error) {
      window.open('https://portal.scamwatch.gov.au/report-a-scam/', '_blank');
    }
  };
  
  console.log('✅ Banner displayed');
}

// Main function
async function main() {
  try {
    console.log('🎯 ScamLens Pro starting...');
    
    // Load rules
    await loadRules();
    
    // Get page text
    const text = getVisibleText();
    console.log(`📄 Page text length: ${text.length} characters`);
    
    // Scan for scam patterns
    const hits = scanText(text);
    
    // Show banner if patterns found
    if (hits.length > 0) {
      showBanner(hits);
    } else {
      console.log('✅ No scam patterns detected');
    }
    
  } catch (error) {
    console.error('❌ ScamLens Pro failed:', error);
  }
}

// Start when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
