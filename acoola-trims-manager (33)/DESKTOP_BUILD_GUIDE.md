# 💻 Acoola Trims ERP - Windows Desktop (.EXE) Build & Packaging Guide
### অ্যাকুলা ট্রিমস ইআরপি - উইন্ডোজ ডেক্সটপ (.EXE) বিল্ড এবং প্যাকেজিং নির্দেশিকা

এই ডকুমেন্ট ফাইলটিতে আপনার সম্পূর্ণ Acoola Trims ERP অ্যাপ্লিকেশনটিকে একটি **স্বতন্ত্র উইন্ডোজ ডেক্সটপ (.EXE) রানিং সফটওয়্যারে** রূপান্তর করার সহজতম পদ্ধতিগুলো দেওয়া হলো।

---

## 🚀 মেথড ১: ১-ক্লিক অটো ডেক্সটপ উইজেট লঞ্চার (১০০% কোনো কোডিং ছাড়াই)
যদি আপনার কোনো কোড রান করতে ইচ্ছা না করে, এবং সরাসরি ডেক্সটপে উইন্ডো আকারে রান করতে চান:
1. অ্যাপের উইন্ডোজ সেটাপ উইজার্ড (ইনস্টল করুন/Install) বাটনে ক্লিক করে শেষ ধাপে যান।
2. সেখানে **"ডাউনলোড করুন উইন্ডোজ লঞ্চার (.BAT)"** বাটনে ক্লিক করুন।
3. একটি `Acoola_Trims_ERP_Launcher.bat` ফাইল ডাউনলোড হবে। এটিকে আপনার উইন্ডোজ ডেক্সটপে সেভ করুন।
4. ফাইলটিতে ডাবল ক্লিক করলেই এটি সরাসরি কোনো অপ্রয়োজনীয় ব্রাউজার বার (Header, URL bar, Search) ছাড়াই একটি স্বতন্ত্র সফটওয়্যারের মতো ফ্রেম হয়ে ওপেন হবে!

---

## 🛠️ মেথড ২: Nativefier ব্যবহার করে ১-কমান্ডে আসল (.EXE) তৈরি
Nativefier একটি ওপেন-সোর্স কমান্ড-লাইন টুল যা যেকোনো ওয়েব অ্যাপ্লিকেশনকে Chromium ভিত্তিক আসল উইন্ডোজ ডেক্সটপ `.exe` এ কনভার্ট করে দেয়।

### পূর্বশর্ত:
আপনার কম্পিউটারে **Node.js** ইনস্টল করা থাকতে হবে (ডাউনলোড লিংক: [nodejs.org](https://nodejs.org/)).

### উইন্ডোজ .EXE বানানোর ধাপসমূহ:
1. আপনার উইন্ডোজের **Command Prompt (CMD)** অথবা **PowerShell** ওপেন করুন।
2. নিচের কমন কমান্ডটি কপি করে এন্টার দিন (এটি গ্লোবালি nativefier রান করবে):
   ```bash
   npx nativefier --name "Acoola Trims ERP" --icon "https://ais-dev-4rq64ijmkajmhmqedlxezz-65798366455.asia-southeast1.run.app/favicon.ico" "https://ais-dev-4rq64ijmkajmhmqedlxezz-65798366455.asia-southeast1.run.app" --single-instance --tray --maximize --fast-quit
   ```
3. কমান্ডটি রান হওয়ার পর আপনার কম্পিউটারে একটি নতুন ফোল্ডার তৈরি হবে যার ভেতর আপনি **Acoola Trims ERP.exe** আইকন সহ সম্পূর্ণ স্বতন্ত্র ডেক্সটপ অ্যাপ্লিকেশন পেয়ে যাবেন!
4. এখন ফোল্ডারটি আপনার পেনড্রাইভ বা কম্পিউটারের যেকোনো জায়গায় নিয়ে ফাইলটিতে ডাবল ক্লিক করে অফলাইন ও অনলাইন ক্লাউড ব্যাকআপ সহ ডেক্সটপ উইন্ডো রান করতে পারবেন।

---

## 🖥️ মেথড ৩: প্রফেশনাল ইলেকট্রন ডেক্সটপ র্যাপার (Electron J.S Build)
আপনি যদি এই সম্পূর্ণ কোডবেস লোকালি বিল্ড করে পুরোপুরি অফলাইন ফাইলে প্যাকেজ করতে চান:

### ১. লোকাল প্রোজেক্ট ডাউনলোড ও সেটআপ:
আপনার লোকাল কম্পিউটারে রিঅ্যাক্ট প্রোজেক্টের ফোল্ডারে এই প্যাকেজগুলো ইনস্টল করুন:
```bash
npm install electron electron-builder dotenv --save-dev
```

### ২. একটি `main.js` তৈরি করুন:
লোকাল ফোল্ডারের রুটে `main.js` নামে ফাইল তৈরি করে নিচের কোডটি রাখুন:
```javascript
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    title: "Acoola Trims Corporation ERP",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // এই ডেভলপমেন্ট লিংকে কানেক্ট করুন অথবা লোকাল বিল্ড 'dist/index.html' লোড করুন
  mainWindow.loadURL('https://ais-dev-4rq64ijmkajmhmqedlxezz-65798366455.asia-southeast1.run.app');
  
  // মেনুবার হাইড করুন আসল সফটওয়ারের লুক দিতে
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
```

### ৩. `package.json` এ বিল্ড স্ক্রিপ্ট যোগ করুন:
```json
"main": "main.js",
"scripts": {
  "electron:dev": "electron .",
  "electron:build": "electron-builder --windows"
}
```

### ৪. রান ও প্যাকেজিং কমান্ড:
* **রান করতে:** `npm run electron:dev`
* **উইন্ডোজ ডেক্সটপ ইনস্টলার .EXE ফাইল ডিরেক্ট বিল্ড করতে:**
  ```bash
  npm run electron:build
  ```
  এটি আপনার লোকাল ফোল্ডারে একটি `dist/` অথবা `out/` ফোল্ডারে ডাবল ক্লিকেবল **Acoola Trims ERP Setup v1.0.0.exe** ফাইল তৈরি হবে, যা যেকোনো কম্পিউটারে পেনড্রাইভ দিয়ে ইনস্টল করে নেওয়া যাবে!
