# Detailed Guide: Linking Multiple Workstations via Windows Shared Folder / Network Drive

This guide provides complete, step-by-step instructions for linking two or more computers (Quality Control Workstations, Laboratory PCs, and Office Laptops) using the **Shared Network Folder Database System** of the Material Reference & Sample Tracking System.

---

## 📌 Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │               HOST COMPUTER (PC 1 / Server)             │
 │         Local Folder: C:\QA_ReferenceTracker_Shared     │
 │       Shared as: \\192.168.1.100\QA_ReferenceTracker_Shared     │
 └────────────────────────────┬────────────────────────────┘
                              │
               Local Area Network (LAN / Wi-Fi)
                              │
       ┌──────────────────────┴──────────────────────┐
       │                                             │
 ┌─────▼───────────────────┐           ┌─────────────▼───────────┐
 │   CLIENT PC 2 (QC Lab)  │           │   CLIENT PC 3 (Office)  │
 │ Path: \\192.168.1.100\...│           │ Mapped Drive: Z:\       │
 └─────────────────────────┘           └─────────────────────────┘
```

- **Zero Dedicated Server Hardware Required**: Any standard Windows 10/11 desktop or office workstation can act as the **Host PC**.
- **Real-Time Bidirectional Sync**: When any PC registers an item, uploads a photo, inspects a sample, or creates a Word form, the updated database and assets are automatically synchronized across all connected workstations in real-time (1–3 second heartbeat).
- **Automated Collision & Lock Handling**: Atomic file operations prevent write collisions when multiple users edit concurrently.

---

## 🛠️ Step 1: Set Up the Host Computer (PC 1)

Perform these steps on the computer that will store the shared database folder (e.g., QC Master PC or Office Server PC).

### 1.1 Create the Dedicated Shared Folder
1. Open Windows File Explorer (`Win + E`).
2. Navigate to your `C:\` drive (or `D:\` drive).
3. Right-click and select **New > Folder**.
4. Name the folder: `QA_ReferenceTracker_Shared` (Full path: `C:\QA_ReferenceTracker_Shared`).

### 1.2 Enable Windows Network Discovery & File Sharing
1. Press `Win + R`, type `control` and hit **Enter** to open the Control Panel.
2. Go to **Network and Internet > Network and Sharing Center**.
3. In the left panel, click **Change advanced sharing settings**.
4. Under **Private network** (or Current profile):
   - Select **Turn on network discovery** and check **Turn on automatic setup of network connected devices**.
   - Select **Turn on file and printer sharing**.
5. Under **All Networks**:
   - Under *Public folder sharing*, choose **Turn on sharing so anyone with network access can read and write files in the Public folders**.
   - Under *Password protected sharing*, choose **Turn off password protected sharing** (recommended for closed lab LANs) OR leave it on if you use Windows User credentials.
6. Click **Save changes**.

> ⚠️ **IMPORTANT (Set Network to Private)**:
> If Windows treats your Wi-Fi or Ethernet connection as **Public**, Windows Firewall will block all incoming connection attempts.
> - Open Windows Settings (`Win + I`) > **Network & Internet** > **Wi-Fi** (or **Ethernet**).
> - Click on your active network and set Network Profile type to **Private network**.

### 1.3 Configure Windows Share Permissions (Full Control)
1. Right-click your `C:\QA_ReferenceTracker_Shared` folder and select **Properties**.
2. Go to the **Sharing** tab.
3. Click the **Advanced Sharing...** button.
4. Check the box: **Share this folder**.
   - Share name: `QA_ReferenceTracker_Shared`
5. Click the **Permissions** button.
6. Select **Everyone** (or add your specific Windows user/group):
   - Check the **Allow** box for:
     - ✅ **Full Control**
     - ✅ **Change**
     - ✅ **Read**
7. Click **Apply**, then **OK** to close the Permissions window.
8. Click **Apply**, then **OK** to close the Advanced Sharing window.

### 1.4 Configure NTFS Security Permissions (Crucial!)
> 💡 *Note: Even if Share permissions are granted, Windows will reject write operations if NTFS Security permissions are not enabled.*

1. In the same Properties window, switch to the **Security** tab.
2. Click the **Edit...** button (to change permissions).
3. Click **Add...** -> type `Everyone` in the text box -> click **Check Names** -> click **OK**.
4. With `Everyone` highlighted in the top box, check **Allow** for:
   - ✅ **Modify**
   - ✅ **Read & execute**
   - ✅ **List folder contents**
   - ✅ **Read**
   - ✅ **Write**
5. Click **Apply**, then click **OK** on all open windows.

### 1.5 Find the Host Computer's IP Address
1. Press `Win + R`, type `cmd` and hit **Enter**.
2. Type `ipconfig` and hit **Enter**.
3. Look for **IPv4 Address** under your active network adapter (e.g. `192.168.1.100`).
4. Type `hostname` and hit **Enter** to see your Computer Name (e.g. `QC-SERVER-PC`).

Your network path is now:
`\\192.168.1.100\QA_ReferenceTracker_Shared\`
or
`\\QC-SERVER-PC\QA_ReferenceTracker_Shared\`

---

## 💻 Step 2: Set Up Client Computers (PC 2, PC 3, Laptops)

Perform these steps on each workstation that needs to connect to the shared database.

### 2.1 Test Network Reachability from Client PC
1. On the Client PC, press `Win + R`.
2. Type the Host path: `\\192.168.1.100\QA_ReferenceTracker_Shared` (replace with your Host IP) and hit **Enter**.
3. If the folder opens in Windows Explorer, your network connection is working!
4. **Test Write Access**: Right-click inside the folder > select **New > Text Document** > delete it. If you can create a file, you have full Read/Write access.

> 🔑 **If Windows asks for a Network Username & Password**:
> - Enter the Windows username and password of the Host PC user account.
> - Check the box **"Remember my credentials"** so you do not have to enter it again.

### 2.2 (Recommended) Map as a Permanent Network Drive (Z:)
Mapping the network share to a drive letter like `Z:\` makes connection ultra-reliable and persistent across Windows reboots:
1. Open Windows File Explorer (`Win + E`).
2. In the left navigation pane, right-click **This PC** and select **Map network drive...** (or click the `...` menu on the top toolbar > Map network drive).
3. Configure the settings:
   - **Drive**: Select `Z:` (or any available letter)
   - **Folder**: `\\192.168.1.100\QA_ReferenceTracker_Shared`
   - ✅ Check: **Reconnect at sign-in**
   - (Optional) Check: **Connect using different credentials** if prompted for login.
4. Click **Finish**.
5. You will now see `Z:\` under "This PC".

---

## 🚀 Step 3: Configure the Application on Both Workstations

### 3.1 On the Host Computer (PC 1):
1. Launch **Material Reference & Sample Tracking System** (`MIRMS.exe`).
2. Navigate to **Admin Dashboard** (or click **Data Management** from the top header).
3. Open the **Shared Network Sync Hub** (or Storage Mode section).
4. Select the **Shared Network Folder Mode** option.
5. In the *Shared Folder Network Path* field, enter:
   `\\192.168.1.100\QA_ReferenceTracker_Shared\` (or `C:\QA_ReferenceTracker_Shared\`).
6. Click **Run Path Diagnostics & Checks**.
   - Verify all 4 indicator boxes turn **GREEN** (`Syntax: Valid`, `Folder Access: Reachable`, `Permissions: Read/Write OK`).
7. Click **"Save Sync Settings"**.
8. Click **"Push Local DB to Share"** to seed your existing catalog, registrations, and templates to the shared folder.

### 3.2 On Client Computers (PC 2, PC 3):
1. Launch **Material Reference & Sample Tracking System** on the Client PC.
2. Navigate to **Admin Dashboard > Shared Network Sync Hub**.
3. Select **Shared Network Folder Mode**.
4. In the *Shared Folder Network Path* field, enter either:
   - UNC Path: `\\192.168.1.100\QA_ReferenceTracker_Shared\`
   - Mapped Drive: `Z:\`
5. Click **Run Path Diagnostics & Checks**.
6. Click **"Force Pull from Share"**.
   - The application will immediately load all master materials, active registrations, photos, and document templates from the shared network drive!
7. The **Auto-Sync Heartbeat** is now active (polling every 1–3 seconds). Whenever any PC saves a change, all other connected PCs will automatically update within seconds.

---

## ⚡ Quick 1-Click Automated Setup Batch Scripts

For rapid configuration, you can use these Windows Batch scripts to automate the setup process.

### Script A: Run on HOST PC (Host Configuration)
Save the following as `SETUP_HOST_SHARE.bat` and run as **Administrator**:

```bat
@echo off
title Setup QA Reference Tracker Shared Folder
echo ===================================================
echo   CONFIGURING HOST PC SHARED FOLDER (MIRMS)
echo ===================================================
echo.

:: 1. Create Folder
set SHARE_DIR=C:\QA_ReferenceTracker_Shared
if not exist "%SHARE_DIR%" (
    mkdir "%SHARE_DIR%"
    echo [OK] Created directory: %SHARE_DIR%
) else (
    echo [INFO] Directory already exists: %SHARE_DIR%
)

:: 2. Set Private Network Profile
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
echo [OK] Set Network Profile to Private.

:: 3. Configure Windows Share
net share QA_ReferenceTracker_Shared /delete >nul 2>&1
net share QA_ReferenceTracker_Shared="%SHARE_DIR%" /grant:Everyone,FULL /unlimited
echo [OK] Created Windows SMB Share with Full Control for Everyone.

:: 4. Configure NTFS Permissions
icacls "%SHARE_DIR%" /grant Everyone:(OI)(CI)F /T /Q
echo [OK] Granted NTFS Full Control permissions to Everyone.

:: 5. Display IP Address
echo.
echo ===================================================
echo   HOST PC CONFIGURATION COMPLETE!
echo ===================================================
echo Your Workstation IP Address is:
ipconfig | findstr /i "IPv4"
echo.
echo Network Path for Client PCs:
echo   \\%COMPUTERNAME%\QA_ReferenceTracker_Shared\
echo.
pause
```

---

### Script B: Run on CLIENT PC (Test & Map Drive)
Save the following as `CONNECT_CLIENT_SHARE.bat` on the Client PC:

```bat
@echo off
title Connect to QA Reference Tracker Shared Folder
echo ===================================================
echo   CONNECTING TO HOST SHARED FOLDER (MIRMS)
echo ===================================================
echo.
set /p HOST_IP="Enter Host PC IP Address or Name (e.g. 192.168.1.100): "

echo Testing connection to \\%HOST_IP%\QA_ReferenceTracker_Shared...
net use Z: /delete /y >nul 2>&1
net use Z: "\\%HOST_IP%\QA_ReferenceTracker_Shared" /persistent:yes

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Connected! Mapped \\%HOST_IP%\QA_ReferenceTracker_Shared to Drive Z:
    echo Opening Z: in Windows Explorer...
    explorer Z:
) else (
    echo.
    echo [ERROR] Could not connect to \\%HOST_IP%\QA_ReferenceTracker_Shared.
    echo Please check firewall settings on the Host PC.
)
echo.
pause
```

---

## 🔍 Troubleshooting Matrix: Errors & Solutions

| Error Message / Symptom | Root Cause | Step-by-Step Fix |
| :--- | :--- | :--- |
| **Error `0x80070035`**<br>*"The network path was not found"* | 1. Windows Network is set to **Public** instead of **Private**.<br>2. Windows Firewall is blocking SMB Port 445.<br>3. Host IP address changed. | 1. On Host PC: Settings > Network & Internet > set profile to **Private**.<br>2. Run in PowerShell (Admin): `New-NetFirewallRule -DisplayName "SMB-In" -Direction Inbound -Protocol TCP -LocalPort 445 -Action Allow`.<br>3. Re-check `ipconfig` on Host PC. |
| **Error `0x80070005`**<br>*"Access is denied"* | Share permissions were granted, but **NTFS Security permissions** were not added for `Everyone`. | Right-click `C:\QA_ReferenceTracker_Shared` > **Properties > Security tab > Edit > Add "Everyone" > Check "Modify" and "Write" > Apply**. |
| **"Network Read-Only"** in App Diagnostic check | The Windows share was created with default "Read" permissions only. | On Host PC: Right-click folder > Properties > Sharing > Advanced Sharing > Permissions > check **Full Control** and **Change**. |
| **Login prompt keeps appearing** when client connects | Windows Password Protected Sharing is turned on, or client credentials are not saved. | 1. Enter Host PC Windows Username and Password, and check **"Remember my credentials"**.<br>2. Or open Control Panel > Credential Manager > Windows Credentials > Add a Windows credential for `\\192.168.1.100`. |
| **"Stale File Lock Detected"** in Database Health scan | A previous workstation abruptly closed while writing, leaving an orphaned `.lock` file. | In the App: Go to **Admin Dashboard > Database Health Diagnostic** > Click **"Reset Connection"** to automatically release orphaned lock files. |
| **Changes not showing immediately on Client PC** | Auto-Sync heartbeat is disabled or interval is too long. | In **Admin Dashboard > Shared Sync**, set Auto-Sync Heartbeat Frequency to **"Every 1 Second (Ultra-Fast)"** or **"Every 3 Seconds (Recommended)"**. |

---

## 📞 Need Assistance?
Use the **Database Health Diagnostic Tool** inside the application (under Admin Dashboard > Database Health) to perform live latency tests, lock scans, and connection resets with a single click.
