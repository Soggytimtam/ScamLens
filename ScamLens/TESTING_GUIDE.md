# 🧪 ScamLens Pro Testing Guide

This guide explains how to test all risk levels and the new "Recommended Next Steps" functionality in ScamLens Pro.

## 📁 Test Files Available

### 1. **risk_level_test.html** - Comprehensive Risk Level Testing
- **Purpose**: Tests all risk levels (Green, Amber, Red) with contextual recommendations
- **Contains**: High-risk, medium-risk, and clean content sections
- **Expected Result**: RED banner with comprehensive next steps

### 2. **next_steps_test.html** - Interactive Next Steps Testing  
- **Purpose**: Specifically tests the new interactive recommendation functionality
- **Contains**: Scenarios for each type of scam pattern
- **Expected Result**: RED banner with clickable next step recommendations

### 3. **clean_test.html** - False Positive Testing
- **Purpose**: Ensures legitimate content doesn't trigger false alarms
- **Contains**: Only clean, legitimate content
- **Expected Result**: GREEN banner or no banner at all

### 4. **test_banner.html** - Original Comprehensive Test
- **Purpose**: Tests multiple scam patterns and banner functionality
- **Contains**: Various scam patterns for general testing
- **Expected Result**: RED banner with pattern highlighting

### 5. **simple_test.html** - Basic Functionality Test
- **Purpose**: Quick test with minimal scam content
- **Contains**: Basic bank detail change pattern
- **Expected Result**: AMBER banner

## 🎯 Testing Different Risk Levels

### 🔴 **RED (High Risk) - Immediate Threat**
**Triggers:** Urgency + Payment scams, Account compromise
**Test Files:** `risk_level_test.html`, `next_steps_test.html`
**Expected Next Steps:**
- 🚨 STOP - Do Not Proceed
- 🔒 Secure Your Accounts  
- 💳 Verify Payment Instructions
- 📝 Report This Scam

### 🟡 **AMBER (Medium Risk) - Suspicious Activity**
**Triggers:** Single pattern matches (bank changes, remote access, etc.)
**Test Files:** `risk_level_test.html`, `simple_test.html`
**Expected Next Steps:**
- 🏦 Contact Your Bank
- 💻 Never Allow Remote Access
- 🏛️ Check Official Government Sites
- 🎯 Research Before Investing

### 🟢 **GREEN (Low/No Risk) - Clean Content**
**Triggers:** No scam patterns detected
**Test Files:** `clean_test.html`
**Expected Next Steps:**
- 🔍 Stay Vigilant
- 📝 Report This Scam (general option)

## 🧪 Step-by-Step Testing Process

### 1. **Setup**
```bash
1. Load ScamLens Pro extension in Chrome Developer Mode
2. Navigate to chrome://extensions/
3. Ensure ScamLens Pro is enabled
4. Open browser console (F12) for debugging
```

### 2. **Test Each Risk Level**
```bash
# Test High Risk
1. Open scamlens/risk_level_test.html
2. Refresh page
3. Verify RED banner appears
4. Check "Recommended Next Steps" section exists
5. Click on different recommendations to test interactions

# Test Medium Risk  
1. Open scamlens/simple_test.html
2. Refresh page
3. Verify AMBER banner appears
4. Check appropriate medium-risk recommendations

# Test Clean Content
1. Open scamlens/clean_test.html
2. Refresh page
3. Verify GREEN banner or no banner
4. Ensure no false positives
```

### 3. **Test Interactive Functionality**
```bash
1. Open scamlens/next_steps_test.html
2. Look for "🛡️ Recommended Next Steps" in banner
3. Click each recommendation to verify:
   - "Report to Scamwatch" → Opens Scamwatch portal
   - "Visit official sites" → Opens myGov.au
   - "Visit MoneySmart.gov.au" → Opens MoneySmart
   - "Close this page immediately" → Shows confirmation
   - "Change passwords now" → Opens password manager
4. Verify visual feedback appears after clicks
```

### 4. **Test Pattern Highlighting**
```bash
1. Click "🔍 Highlight Patterns" button in banner
2. Verify detected text is highlighted with red outlines
3. Hover over highlighted areas
4. Check that indicators appear with pattern explanations
5. Test whitelist functionality on individual patterns
```

## 🔍 What to Look For

### ✅ **Correct Behavior**
- Banner appears with appropriate risk level color
- Two-column layout: "Detected Patterns" + "Recommended Next Steps"
- Next steps are relevant to detected patterns  
- Steps are color-coded by priority
- Clicking steps triggers appropriate actions
- Visual feedback appears when actions are taken
- Pattern highlighting works correctly
- Console shows detailed detection logs

### ❌ **Issues to Watch For**
- Banner doesn't appear when it should
- Wrong risk level color displayed
- Next steps section missing or empty
- Recommendations not relevant to detected patterns
- Click interactions don't work
- External links don't open correctly
- False positives on clean content
- JavaScript errors in console

## 🛠️ Troubleshooting

### **Banner Not Appearing**
1. Check extension is loaded and enabled
2. Refresh the page
3. Check browser console for errors
4. Verify content.js is loading properly

### **Next Steps Not Interactive**  
1. Check for JavaScript errors in console
2. Verify DOM elements are created correctly
3. Test with different browsers
4. Check if popup blocker is interfering

### **Links Not Opening**
1. Check popup blocker settings
2. Verify chrome.tabs permissions
3. Test in incognito mode
4. Check for browser security restrictions

## 📊 Expected Console Output

When testing, you should see console messages like:
```
🎯 ScamLens Pro starting...
📚 Loading rules...
✅ Loaded X ACCC rules
✅ Loaded X Scamwatch alerts
📄 Page text length: X characters
🔍 Found X scam patterns (after filtering whitelisted)
📍 Found locations for X patterns
✅ Beautiful banner displayed
```

## 🚀 Advanced Testing

### **Custom Pattern Testing**
1. Edit `rules/accc_rules.json` to add test patterns
2. Add custom content to test files
3. Verify new patterns are detected correctly

### **Performance Testing**
1. Test on pages with large amounts of text
2. Verify highlighting performance
3. Check memory usage over time

### **Cross-Browser Testing**
1. Test in Chrome, Edge, Firefox (if supported)
2. Verify consistent behavior across browsers
3. Test on different screen sizes

## 📝 Test Results Documentation

When testing, document:
- Which test file was used
- Expected vs actual results
- Any errors or unexpected behavior
- Browser and extension version
- Screenshots of banner appearance
- Console logs for debugging

This comprehensive testing ensures ScamLens Pro works correctly across all risk levels and provides helpful, interactive recommendations to users.
