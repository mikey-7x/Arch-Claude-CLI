# 🤖 Arch-Claude-CLI (Termux Edition)

![Platform: Termux / Arch Linux](https://img.shields.io/badge/Platform-Termux%20%7C%20Arch%20Linux-blue)
![Powered By: Claude 5.1 & Puter](https://img.shields.io/badge/Powered%20By-Claude%205.1%20%7C%20Puter.js-orange)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

A fully-fledged, interactive AI dashboard that runs directly in your **Arch Linux (Termux)** terminal. Powered by Anthropic's **Claude Fable 5.1** and **Claude Opus 5.5** via the [Puter.js API](https://puter.com). 

This CLI acts as a persistent AI assistant that can chat in real-time, read your local files, and securely execute Arch Linux commands to analyze your system—all without needing a paid Anthropic API key!

---

## ✨ Features
- **Real-Time Chat:** A persistent memory system that remembers context during your session.
- **Read Local Files (`/file`):** Seamlessly upload scripts, config files, or text documents directly into Claude's context window.
- **System Analysis (`/cmd`):** Safely execute Arch Linux commands and feed the terminal output directly to Claude for debugging, monitoring, or analysis.
- **No Paid API Keys:** Utilizes the Puter "User-Pays" backend for free access to premium models.
- **Beautiful UI:** Custom ANSI color coding for a clean, readable terminal experience.

---

## 🚀 Installation Guide

### 1. Install Dependencies
Ensure your Termux Arch Linux environment is up to date and install Node.js and NPM.
```bash
sudo pacman -Sy --needed nodejs npm --noconfirm
```
2. Set Up the Project

Create a workspace directory and install the required puter.js library:
```
mkdir -p ~/arch-claude-cli
cd ~/arch-claude-cli
npm init -y
npm install @heyputer/puter.js
```
3. Get Your Free Puter Token

Since Termux is a headless environment, we must pass the Puter Auth Token
manually.

1.  Open your web browser and go to [puter.com/dashboard](puter.com/dashboard).
2.  Sign up or log into your free account.
3.  On the dashboard, locate your Auth Token (a long string of characters).
4.  Copy this token to your clipboard.

To save yourself from pasting it every time, save it to your Arch Linux
environment permanently:
```
echo 'export PUTER_TOKEN="PASTE_YOUR_COPIED_TOKEN_HERE"' >> ~/.bashrc
source ~/.bashrc
```
4. Create the Dashboard Script

Inside your project folder, create the script by running this command:
```
cat << 'EOF' > dashboard.mjs
import { init } from "@heyputer/puter.js/src/init.cjs";
import readline from "readline";
import { exec } from "child_process";
import fs from "fs";

const colors = {
    reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m",
    yellow: "\x1b[33m", red: "\x1b[31m", magenta: "\x1b[35m", bold: "\x1b[1m"
};

const token = process.env.PUTER_TOKEN;
if (!token) {
    console.error(`${colors.red}❌ No token provided! Please run with PUTER_TOKEN="..."${colors.reset}`);
    process.exit(1);
}

const puter = init(token);
let chatHistory = ""; 

const rl = readline.createInterface({
    input: process.stdin, output: process.stdout,
    prompt: `${colors.cyan}${colors.bold}You ❯ ${colors.reset}`
});

console.clear();
console.log(`${colors.magenta}${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}      🤖 ARCH LINUX x CLAUDE FABLE 5.1 CLI       ${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.yellow}Commands:${colors.reset}`);
console.log(` ${colors.green}/file <path>${colors.reset}  - Upload/read a text, script, or config file to Claude`);
console.log(` ${colors.green}/cmd <command>${colors.reset} - Run an Arch Linux command and show Claude the output`);
console.log(` ${colors.green}/clear${colors.reset}         - Wipe Claude's memory/chat history`);
console.log(` ${colors.green}/exit${colors.reset}          - Close the dashboard`);
console.log(`${colors.magenta}====================================================${colors.reset}\n`);

rl.prompt();

rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    if (input.toLowerCase() === "/exit") {
        console.log(`${colors.yellow}Goodbye!${colors.reset}`);
        process.exit(0);
    }
    if (input.toLowerCase() === "/clear") {
        chatHistory = "";
        console.clear();
        console.log(`${colors.green}✅ Chat history cleared.${colors.reset}\n`);
        rl.prompt(); return;
    }

    let promptToSend = input;

    if (input.startsWith("/file ")) {
        const filePath = input.replace("/file ", "").trim();
        try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            console.log(`${colors.green}📄 File loaded (${filePath}). Sending to Claude...${colors.reset}`);
            promptToSend = `I am sharing a file named '${filePath}'. Here are its contents:\n\n${fileContent}\n\nPlease acknowledge you read it and summarize what it is.`;
        } catch (err) {
            console.log(`${colors.red}❌ Error reading file: ${err.message}${colors.reset}`);
            rl.prompt(); return;
        }
    } else if (input.startsWith("/cmd ")) {
        const command = input.replace("/cmd ", "").trim();
        console.log(`${colors.yellow}⚡ Executing command: ${command}${colors.reset}`);
        try {
            const output = await new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) resolve(`ERROR:\n${stderr || error.message}`);
                    else resolve(stdout);
                });
            });
            console.log(`${colors.green}✅ Command executed. Showing output to Claude...${colors.reset}`);
            promptToSend = `I ran the command '${command}' on my Arch Linux system. Here is the terminal output:\n\n${output}\n\nPlease analyze this output for me.`;
        } catch (err) {
            console.log(`${colors.red}❌ Command failed.${colors.reset}`);
            rl.prompt(); return;
        }
    }

    const fullPrompt = `${chatHistory}\nUser: ${promptToSend}`;

    try {
        process.stdout.write(`${colors.yellow}⏳ Fable 5.1 is thinking...${colors.reset}\r`);
        const response = await puter.ai.chat(fullPrompt, { model: "anthropic/claude-fable-5-1" });
        const aiText = typeof response.message.content === 'string' ? response.message.content : response.message.content[0].text;

        chatHistory += `\nUser: ${promptToSend}\nClaude: ${aiText}\n`;
        if (chatHistory.length > 6000) chatHistory = chatHistory.slice(-6000);

        process.stdout.write("\x1b[2K\r"); 
        console.log(`${colors.cyan}${colors.bold}Claude ❯ ${colors.reset}${aiText}\n`);
    } catch (error) {
        process.stdout.write("\x1b[2K\r");
        console.error(`${colors.red}❌ API Error: ${error.message || error}${colors.reset}\n`);
    }
    rl.prompt();
});
EOF
```

OR download it directly in terminal:
```
git clone https://github.com/mikey-7x/Arch-Claude-CLI.git
cd Arch-Claude-CLI
npm install @heyputer/puter.js
node dashboard.mjs
```
🔸if token not work you can directly run this tool with your working token or test it immediately:
```
PUTER_TOKEN="your_long_token_here" node dashboard.mjs
```

🛠️ Usage

To start the dashboard, simply run:

node dashboard.mjs

(Note: If you see an ExperimentalWarning: localStorage is not available, you can
safely ignore it, or run node --localstorage-file=./.puter_storage dashboard.mjs
to hide it).

Available Commands

  - Standard Chat: Just type your message and press Enter.
  - Read Code/Text: /file /path/to/your/script.py
  - Analyze System: /cmd ps aux or /cmd ls -la
  - Extract PDF Text: /cmd pdftotext /path/to/file.pdf - (Requires poppler
    installed)
  - Clear Context: /clear

# 👤 Author

mikey-7x
GitHub: https://github.com/mikey-7x/mikey-7x

# 📄 License

This project is licensed under the MIT License - see the LICENSE file for
details.
