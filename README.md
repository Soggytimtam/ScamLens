# ScamLens - Advanced Scam Detection & Prevention

## 🚀 **What's in ScamLens Pro**

## 🧠 **How It All Works Together (Non-Technical Explanation)**

Imagine ScamLens Pro as a **smart security system** for your computer, like having multiple security experts working together:

### **🎯 The Detection Process:**

1. **🔍 First Line of Defense - Community Watchdogs**
   - We check every website you visit against lists of known bad sites
   - These lists are maintained by security experts and volunteers worldwide
   - Think of it like checking if someone is on a "most wanted" list

2. **🤖 Second Line - AI Brain Analysis**
   - Our AI system reads the content of web pages like a human would
   - It looks for suspicious patterns, urgency tactics, and scam language
   - It learns from your ACCC and Scamwatch rules to understand Australian scams

3. **🛡️ Third Line - Smart Context Checking**
   - We analyze the context: Is this a trusted website? Does the request make sense?
   - We check if the website is trying to rush you or pressure you
   - We look for red flags like requests for gift cards or unusual payment methods

4. **📊 Final Decision - Confidence Scoring**
   - All the information is combined to give you a risk score
   - Red = High risk, Amber = Medium risk, Green = Low risk
   - We explain exactly why we flagged something and what you should do

### **💡 Why This Approach Works Better:**

- **Traditional Scam Detection:** Only looks for exact words or phrases (like a spell-checker)
- **ScamLens Pro AI:** Understands context and meaning (like a human security expert)
- **Community Intelligence:** Leverages the knowledge of thousands of security researchers
- **Local Processing:** Everything happens on your device - no personal information is sent anywhere

---
---

## 🛠️ **Open-Source Libraries & Services We Use**

Think of these like **trusted tools** that help us detect scams, similar to how a security guard uses different equipment to protect a building:

### **🔍 Phishing Detection Services (The "Watchdogs")**

#### **1. URLHaus (Community Blocklist)**
https://urlhaus.abuse.ch
- **What it is:** A free service that collects known bad websites from around the world
- **How it works:** Like a neighborhood watch - people report suspicious websites, and we check against this list
- **Why it's useful:** Catches websites that have already been flagged by security researchers

#### **2. PhishTank (Community-Driven Detection)**
https://phishtank.org
- **What it is:** A free database of phishing websites maintained by volunteers and security experts
- **How it works:** Similar to URLHaus, but specifically focused on phishing (fake login pages, etc.)
- **Why it's useful:** Helps catch fake banking sites, fake social media logins, and other phishing attempts

#### **3. OpenPhish (Automated Detection)**
https://openphish.com
- **What it is:** A free service that automatically finds and lists phishing websites
- **How it works:** Uses computer programs to scan the internet for suspicious patterns
- **Why it's useful:** Catches new phishing sites quickly, often before humans report them

#### **4. Cisco Talos Intelligence (Enterprise Security)**
https://www.talosintelligence.com/reputation
- **What it is:** A free threat intelligence feed from Cisco, a major cybersecurity company
- **How it works:** Provides lists of known malicious IP addresses and domains
- **Why it's useful:** Adds enterprise-grade security intelligence to our detection

#### **5. Emerging Threats (Community Rules)**
https://community.emergingthreats.net 
- **What it is:** A free, community-maintained database of security rules and threat indicators
- **How it works:** Security experts worldwide contribute rules for detecting various threats
- **Why it's useful:** Keeps us updated with the latest threat patterns and attack methods

### **🤖 AI & Machine Learning Libraries (The "Brain")**

#### **4. TensorFlow.js (Google's AI Engine)**
- **What it is:** A free, open-source library that lets us run artificial intelligence directly in your browser
- **How it works:** Like having a smart assistant that learns patterns and can spot new types of scams
- **Why it's useful:** Makes our detection much smarter - it can understand context, not just look for exact words

#### **5. Sentence Transformers (Text Understanding)**
- **What it is:** A free library that helps computers understand the meaning of text, not just individual words
- **How it works:** Like having someone who can read between the lines and understand what's really being said
- **Why it's useful:** Helps us catch sophisticated scams that use clever language to avoid detection

### **🌐 Web Technologies (The "Foundation")**

#### **6. Chrome Extension APIs (Google's Tools)**
- **What it is:** Free tools provided by Google that let us safely interact with web pages
- **How it works:** Like having permission to check what's happening on websites you visit
- **Why it's useful:** Lets us scan pages for scams without compromising your privacy or security

#### **7. FastAPI (Python Web Framework)**
- **What it is:** A free, modern way to build web services that can process information quickly
- **How it works:** Like having a fast, efficient assistant that can handle multiple tasks at once
- **Why it's useful:** Powers our AI analysis and makes everything run smoothly

-------------------------------------

## 🏗️ **Project Structure**

```
ScamLens/
├── scamlens/                    # Chrome extension
│   ├── manifest.json           # Extension configuration
│   ├── background.js           # Multi-service feed manager
│   ├── content.js              # Enhanced page scanner
│   ├── popup.html              # Modern popup interface
│   ├── popup.js                # Popup functionality
│   ├── styles.css              # Professional styling
│   ├── test.html               # Test page
│   ├── ai_engine.js            # AI-powered detection engine
│   ├── false_positive_prevention.js  # False positive prevention
│   ├── auto_reporting.js       # Automatic reporting system
│   ├── icons/                  # Extension icons
│   └── rules/                  # Detection rules
│       ├── accc_rules.json     # ACCC scam patterns
│       └── scamwatch_alerts.json # Live Scamwatch alerts
└---
```

---

## 🔧 **Setup Instructions**

### **1. Load ScamLens Pro Extension**
1. **Open Chrome** → go to `chrome://extensions`
2. **Toggle Developer mode** (top-right)
3. **Click "Load unpacked"** → select the `scamlens` folder
4. **Click "Details"** on ScamLens Pro → turn on **"Allow access to file URLs"**

### **2. Test the Enhanced System**
1. **Open `scamlens/test.html`** in Chrome
2. **Look for the enhanced banner** with:
   - Confidence score display
   - Source attribution ([ACCC], [Scamwatch])
   - Whitelist button
   - Enhanced reporting button

---

## 🎯 **Key Features Breakdown**

### **1. 🤖 AI-Powered Detection**
- **RAG-Style Analysis** - Intelligent search through ACCC rules and Scamwatch alerts
- **Neural Networks** - TensorFlow.js models for pattern recognition and risk assessment
- **Semantic Understanding** - Context-aware scam detection beyond keyword matching
- **Multi-Factor Intelligence** - Combines ML, semantic search, URL analysis, and context
- **Adaptive Learning** - Improves detection accuracy over time

### **2. 🎨 Visual Improvements**
- **Modern gradient backgrounds** with smooth animations
- **AI confidence scoring** displayed prominently with intelligent insights
- **Professional typography** and spacing
- **Responsive design** for mobile devices
- **Enhanced button interactions** with hover effects

### **3. 🔗 Multi-Service Integration**
- **ACCC Rules** (Priority 1) - Australian government guidance
- **Scamwatch Alerts** (Priority 2) - Live scam alerts
- **URLHaus** (Priority 3) - Community phishing blocklist
- **PhishTank** (Priority 4) - Community-driven detection
- **OpenPhish** (Priority 5) - Automated phishing detection
- **Cisco Talos** (Priority 6) - Enterprise threat intelligence
- **Emerging Threats** (Priority 7) - Community security rules

### **4. 🛡️ False Positive Prevention**
- **Context Analysis** - Checks domain reputation and legitimacy
- **Trusted Domain Detection** - Recognizes government, banking, and known-good sites
- **Legitimate Business Indicators** - Identifies official business markers
- **User Whitelisting** - One-click domain whitelisting
- **Confidence Thresholds** - Prevents false alarms

### **5. 📝 Automatic Scamwatch Reporting**
- **Smart Form Pre-filling** - Automatically fills report forms
- **Evidence Collection** - Gathers all detected signals
- **Scam Categorization** - Automatically determines scam type
- **Contact Method Detection** - Identifies how scammer contacted victim
- **Financial Loss Detection** - Detects and quantifies financial impact

### **6. 📊 Confidence Scoring System**
- **Multi-factor Analysis** - Combines rule hits, context, and URL checks
- **Adaptive Thresholds** - Different confidence levels for different severities
- **Context Weighting** - Trusted domains get higher confidence
- **User Feedback Integration** - Learns from user actions

---

## 🧪 **Testing Checklist**

### **ScamLens Pro Extension:**
- [x] Extension loads without errors in `chrome://extensions`
- [x] All JavaScript files have valid syntax
- [x] Required icon files are present (16px, 48px, 128px)
- [x] `test.html` contains scam content for testing
- [x] Banner displays source attribution ([ACCC], [Scamwatch])
- [x] Whitelist button works and adds domains to whitelist
- [x] Report button opens Scamwatch form with pre-filled data
- [x] Extension popup shows enhanced status information
- [x] Multiple service feeds are refreshing properly

------------------------------------------------------------------------------

ScamLens has been completely upgraded with **AI-powered features** for GovHack:

### ✨ **Enhanced Features**
- **🤖 AI-Powered Detection** - RAG-style analysis + TensorFlow.js neural networks
- **🧠 Semantic Understanding** - Goes beyond keywords to understand scam context
- **🎨 Modern UI/UX** - Professional design with AI confidence scoring
- **🔄 Multi-Service Integration** - ACCC, Scamwatch, URLHaus, PhishTank, OpenPhish
- **🛡️ False Positive Prevention** - AI-enhanced context analysis and whitelisting
- **📝 Auto-Reporting** - Automatic Scamwatch form pre-filling
- **📊 Smart Confidence Scoring** - Multi-factor AI analysis for accurate risk assessment
- **⚡ Real-time Updates** - Live Scamwatch alert integration
- **🕐 14-Hour Auto-Refresh** - Automatic threat database updates every 14 hours



---------------------------------------------------------------------

## 🔍 **How It Works**

### **Detection Flow:**
1. **Page Load** → ScamLens Pro initializes all systems
2. **Text Analysis** → Scans content against ACCC + Scamwatch rules
3. **URL Checking** → Checks links against multiple blocklists
4. **Context Analysis** → Evaluates domain reputation and legitimacy
5. **False Positive Filtering** → Applies confidence thresholds
6. **Banner Display** → Shows results with confidence scoring

### **Priority System:**
- **ACCC Rules** → Highest priority (Australian government guidance)
- **Scamwatch Alerts** → Second priority (live scam information)
- **Community Blocklists** → Lower priority (supplementary data)

---

## 🚨 **Common Issues & Fixes**

- **Extension won't load** → Check `chrome://extensions` → Errors → fix syntax issues
- **No banner on test.html** → Enable "Allow access to file URLs" in extension details
- **Background fetch errors** → Check console for specific service failures
- **False positives** → Use whitelist button to exclude trusted sites
- **Reporting not working** → Ensure all permissions are granted

---

## 🔐 **Security & Privacy**

- **All scanning is on-device** - No page content leaves the browser
- **Local rule storage** - Rules cached locally for privacy
- **User-controlled whitelisting** - Users control what gets flagged
- **Transparent confidence scoring** - Users see exactly why something was flagged
---

**ScamLens Pro represents the future of scam detection - combining government guidance, community intelligence, and advanced AI to protect Australians from scams while minimizing false positives.**
