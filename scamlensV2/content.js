// ScamLens Pro - Beautiful Banner with Text Highlighting
let RULES = [];
let SCAMWATCH_ALERTS = [];
let detectedPatterns = new Map(); // Store pattern locations for highlighting

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

// Find and store pattern locations in the page
function findPatternLocations(text, hits) {
  detectedPatterns.clear();
  
  hits.forEach(hit => {
    const locations = [];
    
    // Find all text nodes that contain the pattern
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    
    while (node = walker.nextNode()) {
      const nodeText = node.textContent.toLowerCase();
      try {
        const regex = new RegExp(hit.pattern, 'i');
        if (regex.test(nodeText)) {
          // Find the best parent element to highlight
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            if (parent.tagName && ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'A'].includes(parent.tagName)) {
              locations.push({
                element: parent,
                text: node.textContent,
                pattern: hit.pattern,
                matchedText: nodeText.match(regex)[0]
              });
              break;
            }
            parent = parent.parentElement;
          }
        }
      } catch (error) {
        console.warn('⚠️ Error finding pattern location:', error);
      }
    }
    
    detectedPatterns.set(hit.id, locations);
  });
  
  console.log(`📍 Found locations for ${hits.length} patterns`);
}

// Highlight detected patterns on the page
function highlightPatterns() {
  detectedPatterns.forEach((locations, patternId) => {
    locations.forEach(location => {
      const element = location.element;
      
      // Add highlight styling
      element.style.outline = '3px solid #ff6b6b';
      element.style.outlineOffset = '2px';
      element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
      element.style.borderRadius = '4px';
      element.style.transition = 'all 0.3s ease';
      
      // Add highlight indicator
      const indicator = document.createElement('div');
      indicator.className = 'scamlens-highlight-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: -30px;
        left: 0;
        z-index: 10001;
        background: #ff6b6b;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: bold;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      indicator.textContent = '🚨 Scam Pattern Detected';
      
      // Position the indicator
      const rect = element.getBoundingClientRect();
      indicator.style.left = rect.left + 'px';
      indicator.style.top = (rect.top - 35) + 'px';
      
      document.body.appendChild(indicator);
      
      // Store reference for removal
      element.scamlensIndicator = indicator;
      
      // Show indicator on hover
      element.addEventListener('mouseenter', () => {
        indicator.style.opacity = '1';
      });
      
      element.addEventListener('mouseleave', () => {
        indicator.style.opacity = '0';
      });
    });
  });
}

// Remove all highlights
function removeHighlights() {
  detectedPatterns.forEach((locations) => {
    locations.forEach(location => {
      const element = location.element;
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.backgroundColor = '';
      element.style.borderRadius = '';
      
      if (element.scamlensIndicator) {
        element.scamlensIndicator.remove();
        element.scamlensIndicator = null;
      }
    });
  });
  detectedPatterns.clear();
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

// Show beautiful banner
function showBanner(hits) {
  if (document.getElementById('scamlens-banner')) return;
  
  // Find pattern locations first
  findPatternLocations(getVisibleText(), hits);
  
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
    background: linear-gradient(135deg, ${riskLevel === 'red' ? '#ff4757' : riskLevel === 'amber' ? '#ffa502' : '#2ed573'}, ${riskLevel === 'red' ? '#ff3742' : riskLevel === 'amber' ? '#ff9f43' : '#1e90ff'});
    color: white;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
  `;
  
  // Banner content
  const icon = riskLevel === 'red' ? '🚨' : riskLevel === 'amber' ? '⚠️' : '✅';
  const title = riskLevel === 'red' ? 'High-Risk Scam Detected' : 
                riskLevel === 'amber' ? 'Possible Scam Detected' : 
                'No Scam Signals';
  
  banner.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div style="flex: 1;">
          <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
            ${icon} ${title}
          </h2>
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 15px;">
            Found <strong>${hits.length}</strong> suspicious pattern${hits.length !== 1 ? 's' : ''} on this page
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="scamlens-highlight" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 13px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            🔍 Highlight Patterns
          </button>
          <button id="scamlens-report" style="
            background: white;
            color: ${riskLevel === 'red' ? '#ff4757' : riskLevel === 'amber' ? '#ffa502' : '#2ed573'};
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            📝 Report to Scamwatch
          </button>
          <button id="scamlens-close" style="
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            ✕
          </button>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);">
        <div style="font-size: 13px; font-weight: 500; margin-bottom: 10px; opacity: 0.9;">
          Detected Patterns:
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px;">
          ${hits.map(hit => `
            <div style="
              background: rgba(255,255,255,0.1);
              border-radius: 6px;
              padding: 12px;
              border-left: 4px solid ${hit.severity === 'high' ? '#ff6b6b' : '#ffa502'};
            ">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 12px;">
                [${hit.source}] ${hit.severity.toUpperCase()} RISK
              </div>
              <div style="font-size: 12px; opacity: 0.9; line-height: 1.4;">
                ${hit.why}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  // Add banner to page
  document.body.prepend(banner);
  document.body.style.paddingTop = '140px';
  
  // Event listeners
  document.getElementById('scamlens-close').onclick = () => {
    removeHighlights();
    banner.remove();
    document.body.style.paddingTop = '';
  };
  
  document.getElementById('scamlens-highlight').onclick = () => {
    highlightPatterns();
    // Change button text
    const btn = document.getElementById('scamlens-highlight');
    btn.textContent = '✅ Patterns Highlighted';
    btn.style.background = 'rgba(255,255,255,0.3)';
    btn.disabled = true;
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
  
  console.log('✅ Beautiful banner displayed');
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
