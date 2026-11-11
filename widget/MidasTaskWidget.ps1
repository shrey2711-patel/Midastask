param(
    [string]$Device = ""
)

$ErrorActionPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor 12288

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web.Extensions
Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName Microsoft.VisualBasic

[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)

# Single-instance guard
$createdNew = $false
$script:SingleMutex = New-Object System.Threading.Mutex($true, "MidasTaskWidget_SingleInstance_PS", [ref]$createdNew)
if (-not $createdNew -and [string]::IsNullOrWhiteSpace($Device)) {
    [System.Windows.Forms.MessageBox]::Show(
        "Midas Task Widget is already running in your System Tray (bottom-right taskbar).",
        "Midas Task Widget",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
    exit
}

$script:Json = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$script:AppDir = Join-Path $env:APPDATA "MidasTaskWidget"
if (-not (Test-Path $script:AppDir)) { New-Item -ItemType Directory -Path $script:AppDir -Force | Out-Null }
$script:ConfigPath = Join-Path $script:AppDir "config.json"
$script:CachePath = Join-Path $script:AppDir "cache.json"

$script:DefaultApiBase = "https://midastask.shreypatel00557.workers.dev"

function Load-Config {
    $cfg = @{
        DeviceId    = ""
        ApiBase     = $script:DefaultApiBase
        WindowX     = -9999
        WindowY     = -9999
        AlwaysOnTop = $false
        AutoStart   = $true
    }
    if (Test-Path $script:ConfigPath) {
        try {
            $parsed = $script:Json.DeserializeObject((Get-Content $script:ConfigPath -Raw -Encoding UTF8))
            if ($parsed) {
                foreach ($k in @("DeviceId","ApiBase","WindowX","WindowY","AlwaysOnTop","AutoStart")) {
                    if ($parsed.ContainsKey($k) -and $null -ne $parsed[$k]) { $cfg[$k] = $parsed[$k] }
                }
            }
        } catch {}
    }
    if ([string]::IsNullOrWhiteSpace($cfg.ApiBase)) { $cfg.ApiBase = $script:DefaultApiBase }
    return $cfg
}

function Save-Config {
    try {
        [System.IO.File]::WriteAllText($script:ConfigPath, $script:Json.Serialize($script:Config), [System.Text.Encoding]::UTF8)
    } catch {}
}

$script:Config = Load-Config

if (-not [string]::IsNullOrWhiteSpace($Device)) {
    $dUpper = $Device.Trim().ToUpperInvariant()
    if ($dUpper -in @("OFFICE-PC-01","OFFICE-PC-02","OFFICE-PC-03")) {
        $script:Config.DeviceId = $dUpper
        Save-Config
    }
}

function Show-DevicePicker {
    $pick = New-Object System.Windows.Forms.Form
    $pick.Text = "Midas Task Widget Setup"
    $pick.ClientSize = New-Object System.Drawing.Size(360, 310)
    $pick.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $pick.MaximizeBox = $false
    $pick.MinimizeBox = $false
    $pick.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $pick.BackColor = [System.Drawing.Color]::White

    $t = New-Object System.Windows.Forms.Label
    $t.Text = "MIDAS TASK MANAGEMENT"
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $t.ForeColor = [System.Drawing.Color]::Black
    $t.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $t.SetBounds(20, 18, 320, 32)
    $pick.Controls.Add($t)

    $sub = New-Object System.Windows.Forms.Label
    $sub.Text = "Select which laptop this widget is installed on:"
    $sub.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
    $sub.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
    $sub.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $sub.SetBounds(20, 54, 320, 32)
    $pick.Controls.Add($sub)

    $script:PickedId = ""
    $opts = @(
        @{ label = "1  -  Main HP Laptop (Workstation 1)"; id = "OFFICE-PC-01"; top = 100 },
        @{ label = "2  -  Grey Laptop (Workstation 2)"; id = "OFFICE-PC-02"; top = 158 },
        @{ label = "3  -  Ghanshyam's Laptop (Workstation 3)"; id = "OFFICE-PC-03"; top = 216 }
    )
    foreach ($o in $opts) {
        $btn = New-Object System.Windows.Forms.Button
        $btn.Text = $o.label
        $btn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
        $btn.ForeColor = [System.Drawing.Color]::FromArgb(17, 24, 39)
        $btn.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)
        $btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
        $btn.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
        $btn.FlatAppearance.BorderSize = 1
        $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
        $btn.SetBounds(28, $o.top, 304, 46)
        $idCopy = $o.id
        $btn.Add_Click({
            $script:PickedId = $idCopy
            $pick.DialogResult = [System.Windows.Forms.DialogResult]::OK
            $pick.Close()
        }.GetNewClosure())
        $pick.Controls.Add($btn)
    }

    if ($pick.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK -and $script:PickedId) {
        return $script:PickedId
    }
    return ""
}

if ([string]::IsNullOrWhiteSpace($script:Config.DeviceId)) {
    $chosen = Show-DevicePicker
    if ([string]::IsNullOrWhiteSpace($chosen)) { exit }
    $script:Config.DeviceId = $chosen
    Save-Config
}

# Colors
$script:ColorGreen  = [System.Drawing.Color]::FromArgb(16, 185, 129)
$script:ColorAmber  = [System.Drawing.Color]::FromArgb(245, 158, 11)
$script:ColorRed    = [System.Drawing.Color]::FromArgb(239, 68, 68)
$script:ColorBorder = [System.Drawing.Color]::FromArgb(229, 231, 235)

# State
$script:Devices       = @()
$script:Tasks         = @()
$script:OfflineQueue  = New-Object System.Collections.ArrayList
$script:ClockOffsetMs = [int64]0
$script:CloudOnline   = $false
$script:SyncInFlight  = $false
$script:StatusColor   = "green"
$script:StatusLabel   = "Connecting to cloud..."
$script:StuckTaskId   = $null
$script:StuckDuration = ""
$script:Exiting       = $false

function Get-DeviceDisplayName {
    switch ($script:Config.DeviceId) {
        "OFFICE-PC-02" { return "Grey Laptop" }
        "OFFICE-PC-03" { return "Ghanshyam's Laptop" }
        default        { return "Main HP Laptop" }
    }
}

function Get-DeviceWorkstationLabel {
    $bul = [char]0x2022
    switch ($script:Config.DeviceId) {
        "OFFICE-PC-02" { return "Grey Laptop $bul Workstation 2" }
        "OFFICE-PC-03" { return "Ghanshyam's Laptop $bul Workstation 3" }
        default        { return "Main HP Laptop $bul Workstation 1" }
    }
}

function Get-DeviceBadgeNumber {
    switch ($script:Config.DeviceId) {
        "OFFICE-PC-02" { return "2" }
        "OFFICE-PC-03" { return "3" }
        default        { return "1" }
    }
}

function Get-StatusBrushColor {
    if ($script:StatusColor -eq "yellow") { return $script:ColorAmber }
    if ($script:StatusColor -eq "red")    { return $script:ColorRed }
    return $script:ColorGreen
}

function Save-Cache {
    try {
        $snap = @{
            devices       = $script:Devices
            tasks         = $script:Tasks
            pendingQueue  = @($script:OfflineQueue)
            clockOffsetMs = $script:ClockOffsetMs
        }
        [System.IO.File]::WriteAllText($script:CachePath, $script:Json.Serialize($snap), [System.Text.Encoding]::UTF8)
    } catch {}
}

function Load-Cache {
    if (Test-Path $script:CachePath) {
        try {
            $snap = $script:Json.DeserializeObject((Get-Content $script:CachePath -Raw -Encoding UTF8))
            if ($snap) {
                if ($snap.ContainsKey("devices") -and $snap["devices"]) { $script:Devices = @($snap["devices"]) }
                if ($snap.ContainsKey("tasks") -and $snap["tasks"])     { $script:Tasks = @($snap["tasks"]) }
                if ($snap.ContainsKey("pendingQueue") -and $snap["pendingQueue"]) {
                    foreach ($q in $snap["pendingQueue"]) { [void]$script:OfflineQueue.Add($q) }
                }
                if ($snap.ContainsKey("clockOffsetMs")) { $script:ClockOffsetMs = [int64]$snap["clockOffsetMs"] }
            }
        } catch {}
    }
}

function Apply-AutoStart([bool]$enable) {
    try {
        $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
        $vbsPath = Join-Path $PSScriptRoot "Launch-MidasWidget.vbs"
        if (-not (Test-Path $vbsPath)) {
            $vbsPath = Join-Path (Join-Path $env:LOCALAPPDATA "MidasTaskWidget") "Launch-MidasWidget.vbs"
        }
        if ($enable) {
            Set-ItemProperty -Path $regPath -Name "MidasTaskWidget" -Value "wscript.exe `"$vbsPath`""
        } else {
            Remove-ItemProperty -Path $regPath -Name "MidasTaskWidget" -ErrorAction SilentlyContinue
        }
    } catch {}
}

function Reanalyze-Status {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + $script:ClockOffsetMs
    $thresholdMins = 30
    foreach ($d in $script:Devices) {
        if ($d["id"] -eq $script:Config.DeviceId -and $d.ContainsKey("stuckThresholdMinutes") -and [int]$d["stuckThresholdMinutes"] -gt 0) {
            $thresholdMins = [int]$d["stuckThresholdMinutes"]
        }
    }

    $stuck = $null
    $maxElapsed = [int64]0
    foreach ($t in $script:Tasks) {
        if ($t["deviceId"] -ne $script:Config.DeviceId) { continue }
        if ([bool]$t["completed"]) { continue }
        $started = if ($t.ContainsKey("startedAt") -and $t["startedAt"]) { [int64]$t["startedAt"] } else { $now }
        $elapsed = [Math]::Max([int64]0, [int64][Math]::Floor(($now - $started) / 60000))
        if ($elapsed -ge $thresholdMins -and $elapsed -gt $maxElapsed) {
            $maxElapsed = $elapsed
            $stuck = $t
        }
    }

    if ($null -ne $stuck) {
        $script:StatusColor = "yellow"
        $hrs = [Math]::Floor($maxElapsed / 60)
        $mins = $maxElapsed % 60
        $script:StuckDuration = if ($hrs -gt 0) { "${hrs}h ${mins}m" } else { "${maxElapsed}m" }
        $script:StuckTaskId = $stuck["id"]
        $script:StatusLabel = "Stuck in task ($($script:StuckDuration))"
    } else {
        $script:StatusColor = "green"
        $script:StuckTaskId = $null
        $script:StuckDuration = ""
        $script:StatusLabel = if ($script:CloudOnline) { "Working Good (Cloud Active)" } else { "Offline Cache Mode" }
    }
}

# In-memory Win32 P/Invoke (zero temp DLLs on disk, compatible with Smart App Control)
function Init-Win32Native {
    if ($script:Win32User32) { return }
    $ab = [AppDomain]::CurrentDomain.DefineDynamicAssembly(
        (New-Object Reflection.AssemblyName("MidasInMemWin32")),
        [Reflection.Emit.AssemblyBuilderAccess]::Run
    )
    $mb = $ab.DefineDynamicModule("Mod")
    $tb = $mb.DefineType("User32", "Public, Abstract, Sealed")
    $addP = {
        param($n, $r, $p)
        $m = $tb.DefinePInvokeMethod(
            $n, "user32.dll", "Public, Static, PinvokeImpl",
            [Reflection.CallingConventions]::Standard, $r, $p,
            [Runtime.InteropServices.CallingConvention]::Winapi,
            [Runtime.InteropServices.CharSet]::Unicode
        )
        $m.SetImplementationFlags([Reflection.MethodImplAttributes]::PreserveSig)
    }
    & $addP "FindWindowW" ([IntPtr]) @([string], [string])
    & $addP "SetWindowPos" ([bool]) @([IntPtr], [IntPtr], [int], [int], [int], [int], [uint32])
    & $addP "IsWindow" ([bool]) @([IntPtr])
    if ([IntPtr]::Size -eq 8) {
        & $addP "GetWindowLongPtrW" ([IntPtr]) @([IntPtr], [int])
        & $addP "SetWindowLongPtrW" ([IntPtr]) @([IntPtr], [int], [IntPtr])
    } else {
        & $addP "GetWindowLongW" ([IntPtr]) @([IntPtr], [int])
        & $addP "SetWindowLongW" ([IntPtr]) @([IntPtr], [int], [IntPtr])
    }
    $script:Win32User32 = $tb.CreateType()
}

function Get-WinLong([IntPtr]$hwnd, [int]$idx) {
    if ([IntPtr]::Size -eq 8) { return $script:Win32User32::GetWindowLongPtrW($hwnd, $idx) }
    return $script:Win32User32::GetWindowLongW($hwnd, $idx)
}

function Set-WinLong([IntPtr]$hwnd, [int]$idx, [IntPtr]$val) {
    if ([IntPtr]::Size -eq 8) { return $script:Win32User32::SetWindowLongPtrW($hwnd, $idx, $val) }
    return $script:Win32User32::SetWindowLongW($hwnd, $idx, $val)
}

function Enforce-DesktopWidgetMode([bool]$forceZOrder = $false) {
    if (-not $form -or -not $form.IsHandleCreated) { return }
    try {
        Init-Win32Native
        $hwnd = $form.Handle

        # 1. Mark as ToolWindow so it never shows in Alt+Tab or Taskbar
        $GWL_EXSTYLE = -20
        $WS_EX_TOOLWINDOW = [int64]0x00000080
        $WS_EX_APPWINDOW  = [int64]0x00040000
        $curEx = (Get-WinLong $hwnd $GWL_EXSTYLE).ToInt64()
        $nextEx = ($curEx -bor $WS_EX_TOOLWINDOW) -band (-bnot $WS_EX_APPWINDOW)
        if ($curEx -ne $nextEx) {
            [void](Set-WinLong $hwnd $GWL_EXSTYLE ([IntPtr]$nextEx))
        }

        # 2. Set Progman as Owner (GWLP_HWNDPARENT = -8) so Win+D / Show Desktop NEVER minimizes widget
        $progman = $script:Win32User32::FindWindowW("Progman", $null)
        if ($progman -ne [IntPtr]::Zero -and $script:Win32User32::IsWindow($progman)) {
            $curOwner = Get-WinLong $hwnd -8
            if ($curOwner -ne $progman) {
                [void](Set-WinLong $hwnd -8 $progman)
            }
        }

        # 3. Never allow Minimized or Hidden state on Desktop
        if (-not $script:Exiting -and -not $form.Visible) {
            $form.Show()
        }
        if ($form.WindowState -ne [System.Windows.Forms.FormWindowState]::Normal) {
            $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
        }

        # 4. Keep Z-order either AlwaysOnTop or cleanly resting on Desktop (HWND_BOTTOM)
        $SWP_NOSIZE = [uint32]0x0001
        $SWP_NOMOVE = [uint32]0x0002
        $SWP_NOACTIVATE = [uint32]0x0010
        $flags = $SWP_NOSIZE -bor $SWP_NOMOVE -bor $SWP_NOACTIVATE
        if ($script:Config.AlwaysOnTop) {
            [void]$script:Win32User32::SetWindowPos($hwnd, [IntPtr](-1), 0, 0, 0, 0, $flags)
        } elseif ($forceZOrder -or ([System.Windows.Forms.Form]::ActiveForm -ne $form -and -not $script:Dragging)) {
            # Owned window at HWND_BOTTOM stays above Progman wallpaper & behind open apps
            [void]$script:Win32User32::SetWindowPos($hwnd, [IntPtr]1, 0, 0, 0, 0, $flags)
        }
    } catch {}
}

# Build Main Widget Window
$form = New-Object System.Windows.Forms.Form
$form.Text = "Midas Task Widget"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.BackColor = [System.Drawing.Color]::White
$form.Size = New-Object System.Drawing.Size(360, 540)
$form.TopMost = [bool]$script:Config.AlwaysOnTop
$form.ShowInTaskbar = $false
$form.MinimizeBox = $false
$form.MaximizeBox = $false

$form.Add_HandleCreated({ Enforce-DesktopWidgetMode $true })
$form.Add_Shown({ Enforce-DesktopWidgetMode $true })
$form.Add_Deactivate({
    if (-not $script:Config.AlwaysOnTop) {
        Enforce-DesktopWidgetMode $true
    }
})
$form.Add_Resize({
    if ($form.WindowState -ne [System.Windows.Forms.FormWindowState]::Normal) {
        $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    }
})

$wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
if ($script:Config.WindowX -ge ($wa.Left - 50) -and $script:Config.WindowX -le ($wa.Right - 60) -and
    $script:Config.WindowY -ge ($wa.Top - 50) -and $script:Config.WindowY -le ($wa.Bottom - 60)) {
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $form.Location = New-Object System.Drawing.Point([int]$script:Config.WindowX, [int]$script:Config.WindowY)
} else {
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $form.Location = New-Object System.Drawing.Point(($wa.Right - $form.Width - 20), ($wa.Top + 20))
}

$form.Add_Paint({
    param($s, $e)
    $pen = New-Object System.Drawing.Pen($script:ColorBorder, 1)
    $e.Graphics.DrawRectangle($pen, 0, 0, $form.Width - 1, $form.Height - 1)
    $pen.Dispose()
})

$topBar = New-Object System.Windows.Forms.Panel
$topBar.SetBounds(1, 1, $form.Width - 2, 4)
$topBar.BackColor = $script:ColorGreen
$form.Controls.Add($topBar)

$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.SetBounds(1, 5, $form.Width - 2, 162)
$headerPanel.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($headerPanel)

# Drag helpers
$script:Dragging = $false
$script:DragMouse = [System.Drawing.Point]::Empty
$script:DragForm  = [System.Drawing.Point]::Empty

function Attach-Drag($ctrl) {
    $ctrl.Add_MouseDown({
        param($s, $e)
        if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
            $script:Dragging = $true
            $script:DragMouse = [System.Windows.Forms.Control]::MousePosition
            $script:DragForm  = $form.Location
        }
    })
    $ctrl.Add_MouseMove({
        param($s, $e)
        if ($script:Dragging) {
            $cur = [System.Windows.Forms.Control]::MousePosition
            $form.Location = New-Object System.Drawing.Point(
                ($script:DragForm.X + ($cur.X - $script:DragMouse.X)),
                ($script:DragForm.Y + ($cur.Y - $script:DragMouse.Y))
            )
        }
    })
    $ctrl.Add_MouseUp({
        param($s, $e)
        if ($script:Dragging) {
            $script:Dragging = $false
            $script:Config.WindowX = $form.Location.X
            $script:Config.WindowY = $form.Location.Y
            Save-Config
        }
    })
}
Attach-Drag $headerPanel

$btnPin = New-Object System.Windows.Forms.Button
$btnPin.Text = if ($script:Config.AlwaysOnTop) { "PIN" } else { "pin" }
$btnPin.SetBounds($form.Width - 44, 6, 34, 24)
$btnPin.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnPin.FlatAppearance.BorderSize = 0
$btnPin.BackColor = [System.Drawing.Color]::White
$btnPin.ForeColor = if ($script:Config.AlwaysOnTop) { [System.Drawing.Color]::FromArgb(37, 99, 235) } else { [System.Drawing.Color]::FromArgb(148, 163, 184) }
$btnPin.Font = New-Object System.Drawing.Font("Segoe UI", 7.5, [System.Drawing.FontStyle]::Bold)
$btnPin.Cursor = [System.Windows.Forms.Cursors]::Hand
$headerPanel.Controls.Add($btnPin)

$btnMenu = New-Object System.Windows.Forms.Button
$btnMenu.Text = "..."
$btnMenu.SetBounds($form.Width - 72, 6, 26, 24)
$btnMenu.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnMenu.FlatAppearance.BorderSize = 0
$btnMenu.BackColor = [System.Drawing.Color]::White
$btnMenu.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$btnMenu.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$btnMenu.Cursor = [System.Windows.Forms.Cursors]::Hand
$headerPanel.Controls.Add($btnMenu)

$lblActive = New-Object System.Windows.Forms.Label
$lblActive.Text = "Active Users"
$lblActive.Font = New-Object System.Drawing.Font("Segoe UI", 13.5)
$lblActive.ForeColor = [System.Drawing.Color]::FromArgb(55, 65, 81)
$lblActive.SetBounds(18, 14, 210, 26)
Attach-Drag $lblActive
$headerPanel.Controls.Add($lblActive)

$lblLaptop = New-Object System.Windows.Forms.Label
$lblLaptop.Text = (Get-DeviceDisplayName).ToUpperInvariant()
$lblLaptop.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$lblLaptop.ForeColor = [System.Drawing.Color]::FromArgb(17, 24, 39)
$lblLaptop.SetBounds(18, 42, 220, 18)
Attach-Drag $lblLaptop
$headerPanel.Controls.Add($lblLaptop)

$lblDept = New-Object System.Windows.Forms.Label
$lblDept.Text = Get-DeviceWorkstationLabel
$lblDept.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$lblDept.ForeColor = [System.Drawing.Color]::FromArgb(156, 163, 175)
$lblDept.SetBounds(18, 60, 220, 16)
Attach-Drag $lblDept
$headerPanel.Controls.Add($lblDept)

$lblSync = New-Object System.Windows.Forms.Label
$lblSync.Text = "$([char]0x25CF) Connecting..."
$lblSync.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblSync.ForeColor = $script:ColorGreen
$lblSync.SetBounds(18, 78, 225, 18)
Attach-Drag $lblSync
$headerPanel.Controls.Add($lblSync)

$badgePanel = New-Object System.Windows.Forms.Panel
$badgePanel.SetBounds($form.Width - 68, 42, 46, 46)
$badgePanel.BackColor = [System.Drawing.Color]::White
$badgePanel.Add_Paint({
    param($s, $e)
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $br = New-Object System.Drawing.SolidBrush((Get-StatusBrushColor))
    $e.Graphics.FillEllipse($br, 1, 1, 43, 43)
    $br.Dispose()
    $f = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $e.Graphics.DrawString((Get-DeviceBadgeNumber), $f, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(1, 1, 43, 43)), $sf)
    $f.Dispose()
    $sf.Dispose()
})
Attach-Drag $badgePanel
$headerPanel.Controls.Add($badgePanel)

$lblNotesTitle = New-Object System.Windows.Forms.Label
$lblNotesTitle.Text = "notes list"
$lblNotesTitle.Font = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Bold)
$lblNotesTitle.ForeColor = [System.Drawing.Color]::Black
$lblNotesTitle.SetBounds(18, 102, 200, 36)
Attach-Drag $lblNotesTitle
$headerPanel.Controls.Add($lblNotesTitle)

$lblNotesCount = New-Object System.Windows.Forms.Label
$lblNotesCount.Text = "0/0"
$lblNotesCount.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$lblNotesCount.ForeColor = [System.Drawing.Color]::FromArgb(156, 163, 175)
$lblNotesCount.TextAlign = [System.Drawing.ContentAlignment]::BottomRight
$lblNotesCount.SetBounds($form.Width - 98, 114, 76, 20)
Attach-Drag $lblNotesCount
$headerPanel.Controls.Add($lblNotesCount)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = "with checkbox"
$lblSub.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$lblSub.ForeColor = [System.Drawing.Color]::FromArgb(107, 114, 128)
$lblSub.SetBounds(18, 138, 220, 18)
Attach-Drag $lblSub
$headerPanel.Controls.Add($lblSub)

$tasksScroll = New-Object System.Windows.Forms.Panel
$tasksScroll.SetBounds(12, 168, $form.Width - 24, $form.Height - 182)
$tasksScroll.BackColor = [System.Drawing.Color]::White
$tasksScroll.AutoScroll = $true
$form.Controls.Add($tasksScroll)

# Tray Icon & Menu
$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
[void]$trayMenu.Items.Add("Show / Bring to Front", $null, {
    $form.Show()
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    $form.Activate()
})

$menuTop = New-Object System.Windows.Forms.ToolStripMenuItem("Always On Top")
$menuTop.Checked = [bool]$script:Config.AlwaysOnTop
$menuTop.Add_Click({
    $script:Config.AlwaysOnTop = -not [bool]$script:Config.AlwaysOnTop
    Save-Config
    $form.TopMost = [bool]$script:Config.AlwaysOnTop
    $menuTop.Checked = [bool]$script:Config.AlwaysOnTop
    $btnPin.Text = if ($script:Config.AlwaysOnTop) { "PIN" } else { "pin" }
    $btnPin.ForeColor = if ($script:Config.AlwaysOnTop) { [System.Drawing.Color]::FromArgb(37, 99, 235) } else { [System.Drawing.Color]::FromArgb(148, 163, 184) }
    Enforce-DesktopWidgetMode $true
})
[void]$trayMenu.Items.Add($menuTop)

$btnPin.Add_Click({ $menuTop.PerformClick() })
$btnMenu.Add_Click({ $trayMenu.Show($btnMenu, (New-Object System.Drawing.Point(0, $btnMenu.Height))) })

$menuAuto = New-Object System.Windows.Forms.ToolStripMenuItem("Start with Windows")
$menuAuto.Checked = [bool]$script:Config.AutoStart
$menuAuto.Add_Click({
    $script:Config.AutoStart = -not [bool]$script:Config.AutoStart
    Save-Config
    Apply-AutoStart ([bool]$script:Config.AutoStart)
    $menuAuto.Checked = [bool]$script:Config.AutoStart
})
[void]$trayMenu.Items.Add($menuAuto)

$switchMenu = New-Object System.Windows.Forms.ToolStripMenuItem("Switch Laptop")
$menuPc1 = New-Object System.Windows.Forms.ToolStripMenuItem("1 - Main HP Laptop")
$menuPc2 = New-Object System.Windows.Forms.ToolStripMenuItem("2 - Grey Laptop")
$menuPc3 = New-Object System.Windows.Forms.ToolStripMenuItem("3 - Ghanshyam's Laptop")
[void]$switchMenu.DropDownItems.AddRange(@($menuPc1, $menuPc2, $menuPc3))
[void]$trayMenu.Items.Add($switchMenu)

function Switch-Laptop([string]$newId) {
    $oldId = $script:Config.DeviceId
    if ($oldId -eq $newId) { return }
    Send-HeartbeatSync $oldId $false
    $script:Config.DeviceId = $newId
    Save-Config
    Send-HeartbeatAsync $true
    Trigger-CloudSync
    Render-All
}
$menuPc1.Add_Click({ Switch-Laptop "OFFICE-PC-01" })
$menuPc2.Add_Click({ Switch-Laptop "OFFICE-PC-02" })
$menuPc3.Add_Click({ Switch-Laptop "OFFICE-PC-03" })

[void]$trayMenu.Items.Add("Sync Now", $null, { Trigger-CloudSync })
[void]$trayMenu.Items.Add("Open Web Dashboard", $null, {
    Start-Process ($script:Config.ApiBase + "/dashboard.html") | Out-Null
})
[void]$trayMenu.Items.Add("-")
[void]$trayMenu.Items.Add("Exit Widget (Go Offline)", $null, { Exit-Cleanly })

$trayIcon = New-Object System.Windows.Forms.NotifyIcon
$trayIcon.Visible = $true
$trayIcon.ContextMenuStrip = $trayMenu
$trayIcon.Add_DoubleClick({
    $form.Show()
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    Enforce-DesktopWidgetMode $true
    $form.Activate()
})

function Update-TrayIcon {
    try {
        $bmp = New-Object System.Drawing.Bitmap(16, 16)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)
        $br = New-Object System.Drawing.SolidBrush((Get-StatusBrushColor))
        $g.FillEllipse($br, 1, 1, 14, 14)
        $br.Dispose()
        $f = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString((Get-DeviceBadgeNumber), $f, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 0, 16, 16)), $sf)
        $f.Dispose(); $sf.Dispose(); $g.Dispose()
        $trayIcon.Icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
        $bmp.Dispose()
        $trayIcon.Text = "Midas Task $([char]0x2022) " + (Get-DeviceDisplayName)
    } catch {}
    $menuPc1.Checked = ($script:Config.DeviceId -eq "OFFICE-PC-01")
    $menuPc2.Checked = ($script:Config.DeviceId -eq "OFFICE-PC-02")
    $menuPc3.Checked = ($script:Config.DeviceId -eq "OFFICE-PC-03")
}

function Update-StatusVisuals {
    $c = Get-StatusBrushColor
    $topBar.BackColor = $c
    $badgePanel.Invalidate()
    $lblSync.ForeColor = if ($script:CloudOnline) { $c } else { $script:ColorRed }
    $qTxt = if ($script:OfflineQueue.Count -gt 0) { " (Queued: $($script:OfflineQueue.Count))" } else { "" }
    $lblSync.Text = "$([char]0x25CF) $($script:StatusLabel)$qTxt"
    Update-TrayIcon
}

$script:HttpClient = New-Object System.Net.Http.HttpClient
$script:HttpClient.Timeout = [TimeSpan]::FromSeconds(10)
$script:HttpClient.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MidasTaskWidget/1.0") | Out-Null
$script:AsyncJobs = New-Object System.Collections.ArrayList

function Enqueue-HttpJob($netTask, $onDone) {
    [void]$script:AsyncJobs.Add(@{ task = $netTask; onDone = $onDone })
}

function Toggle-TaskOptimistic($item) {
    $item["completed"] = -not [bool]$item["completed"]
    if (-not [bool]$item["completed"]) {
        $item["startedAt"] = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + $script:ClockOffsetMs
    }
    Save-Cache
    Render-All

    $idCapture = [string]$item["id"]
    $compCapture = [bool]$item["completed"]
    $content = New-Object System.Net.Http.StringContent("{}", [System.Text.Encoding]::UTF8, "application/json")
    $reqTask = $script:HttpClient.PostAsync("$($script:Config.ApiBase)/api/tasks/$([Uri]::EscapeDataString($idCapture))/toggle", $content)
    Enqueue-HttpJob $reqTask ({
        param($ok, $body)
        if (-not $ok) {
            [void]$script:OfflineQueue.Add(@{ id = $idCapture; completed = $compCapture })
            Save-Cache
            Update-StatusVisuals
        } else {
            Trigger-CloudSync
        }
    }.GetNewClosure())
}

function Render-All {
    Reanalyze-Status
    $lblLaptop.Text = (Get-DeviceDisplayName).ToUpperInvariant()
    $lblDept.Text = Get-DeviceWorkstationLabel
    Update-StatusVisuals

    $mine = @()
    $done = 0
    foreach ($t in $script:Tasks) {
        if ($t["deviceId"] -eq $script:Config.DeviceId) {
            $mine += $t
            if ([bool]$t["completed"]) { $done++ }
        }
    }
    $lblNotesCount.Text = "$done/$($mine.Count)"

    $savedY = -$tasksScroll.AutoScrollPosition.Y
    $tasksScroll.SuspendLayout()
    $tasksScroll.Controls.Clear()

    if ($mine.Count -eq 0) {
        $empty = New-Object System.Windows.Forms.Label
        $empty.Text = "All tasks completed!`nWaiting for assignments from Admin."
        $empty.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
        $empty.ForeColor = [System.Drawing.Color]::FromArgb(156, 163, 175)
        $empty.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
        $empty.SetBounds(10, 40, $tasksScroll.Width - 36, 60)
        $tasksScroll.Controls.Add($empty)
    } else {
        $y = 2
        $rowW = $tasksScroll.Width - 24
        foreach ($item in $mine) {
            $isComp = [bool]$item["completed"]
            $isStuck = ($script:StuckTaskId -eq $item["id"] -and -not $isComp)
            $titleStr = [string]$item["title"]
            $textW = $rowW - 52
            $fontStyle = if ($isComp) { [System.Drawing.FontStyle]::Strikeout } else { [System.Drawing.FontStyle]::Bold }
            $titleFont = New-Object System.Drawing.Font("Segoe UI", 9.5, $fontStyle)
            $measured = [System.Windows.Forms.TextRenderer]::MeasureText($titleStr, $titleFont, (New-Object System.Drawing.Size($textW, 200)), [System.Windows.Forms.TextFormatFlags]::WordBreak)
            $rowH = [Math]::Max(60, $measured.Height + 38)

            $row = New-Object System.Windows.Forms.Panel
            $row.Size = New-Object System.Drawing.Size($rowW, $rowH)
            $row.Location = New-Object System.Drawing.Point(2, $y)
            $row.BackColor = if ($isStuck) { [System.Drawing.Color]::FromArgb(255, 251, 235) } else { [System.Drawing.Color]::FromArgb(249, 250, 251) }
            $row.Cursor = [System.Windows.Forms.Cursors]::Hand

            $rowCopy = $row
            $compCopy = $isComp
            $stuckCopy = $isStuck
            $row.Add_Paint({
                param($s, $e)
                $bc = if ($stuckCopy) { $script:ColorAmber } else { [System.Drawing.Color]::FromArgb(241, 245, 249) }
                $p = New-Object System.Drawing.Pen($bc, 1)
                $e.Graphics.DrawRectangle($p, 0, 0, $rowCopy.Width - 1, $rowCopy.Height - 1)
                $p.Dispose()

                $cb = New-Object System.Drawing.Rectangle(12, 14, 18, 18)
                if ($compCopy) {
                    $br = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(17, 24, 39))
                    $e.Graphics.FillRectangle($br, $cb)
                    $br.Dispose()
                    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                    $wp = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2.2)
                    $pts = @(
                        (New-Object System.Drawing.Point(($cb.X + 4), ($cb.Y + 9))),
                        (New-Object System.Drawing.Point(($cb.X + 7), ($cb.Y + 13))),
                        (New-Object System.Drawing.Point(($cb.X + 14), ($cb.Y + 5)))
                    )
                    $e.Graphics.DrawLines($wp, $pts)
                    $wp.Dispose()
                } else {
                    $e.Graphics.FillRectangle([System.Drawing.Brushes]::White, $cb)
                    $bp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(203, 213, 225), 1.5)
                    $e.Graphics.DrawRectangle($bp, $cb)
                    $bp.Dispose()
                }
            }.GetNewClosure())

            $lblT = New-Object System.Windows.Forms.Label
            $lblT.Text = $titleStr
            $lblT.Font = $titleFont
            $lblT.ForeColor = if ($isComp) { [System.Drawing.Color]::FromArgb(156, 163, 175) } else { [System.Drawing.Color]::FromArgb(17, 24, 39) }
            $lblT.SetBounds(40, 11, $textW, $measured.Height + 4)
            $lblT.BackColor = [System.Drawing.Color]::Transparent
            $lblT.Cursor = [System.Windows.Forms.Cursors]::Hand
            $row.Controls.Add($lblT)

            $bul = [char]0x2022
            $prio = if ($item["priority"]) { ([string]$item["priority"]).ToUpperInvariant() } else { "MEDIUM" }
            $meta = $prio
            if ($item["category"]) { $meta += "  $bul  #" + [string]$item["category"] }
            if ($isStuck) { $meta += "  $bul  STUCK ($($script:StuckDuration))" }

            $lblM = New-Object System.Windows.Forms.Label
            $lblM.Text = $meta
            $lblM.Font = New-Object System.Drawing.Font("Segoe UI", 7.5, $(if ($isStuck) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }))
            $lblM.ForeColor = if ($isStuck) { [System.Drawing.Color]::FromArgb(180, 83, 9) } else { [System.Drawing.Color]::FromArgb(100, 116, 139) }
            $lblM.SetBounds(40, $measured.Height + 16, $textW, 16)
            $lblM.BackColor = [System.Drawing.Color]::Transparent
            $lblM.Cursor = [System.Windows.Forms.Cursors]::Hand
            $row.Controls.Add($lblM)

            $itemCopy = $item
            $clickScript = { Toggle-TaskOptimistic $itemCopy }.GetNewClosure()
            $row.Add_Click($clickScript)
            $lblT.Add_Click($clickScript)
            $lblM.Add_Click($clickScript)

            $tasksScroll.Controls.Add($row)
            $y += $rowH + 8
        }
    }

    $tasksScroll.ResumeLayout()
    if ($savedY -gt 0) {
        try { $tasksScroll.AutoScrollPosition = New-Object System.Drawing.Point(0, $savedY) } catch {}
    }
}

function Send-HeartbeatSync([string]$devId, [bool]$online) {
    if ([string]::IsNullOrWhiteSpace($devId)) { return }
    try {
        $req = [System.Net.HttpWebRequest]::Create("$($script:Config.ApiBase)/api/heartbeat")
        $req.Method = "POST"
        $req.ContentType = "application/json"
        $req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MidasTaskWidget/1.0"
        $req.Timeout = 2500
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($script:Json.Serialize(@{
            deviceId    = $devId
            isPoweredOn = $online
            hostname    = $env:COMPUTERNAME
        }))
        $req.ContentLength = $bytes.Length
        $st = $req.GetRequestStream()
        $st.Write($bytes, 0, $bytes.Length)
        $st.Close()
        $res = $req.GetResponse()
        $res.Close()
    } catch {}
}

function Send-HeartbeatAsync([bool]$online) {
    if ($script:Exiting) { return }
    try {
        $body = $script:Json.Serialize(@{
            deviceId    = $script:Config.DeviceId
            isPoweredOn = $online
            hostname    = $env:COMPUTERNAME
        })
        $content = New-Object System.Net.Http.StringContent($body, [System.Text.Encoding]::UTF8, "application/json")
        $reqTask = $script:HttpClient.PostAsync("$($script:Config.ApiBase)/api/heartbeat", $content)
        Enqueue-HttpJob $reqTask $null
    } catch {}
}

function Pull-StateAsync {
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $uri = "$($script:Config.ApiBase)/api/state?deviceId=$([Uri]::EscapeDataString($script:Config.DeviceId))&_t=$ts"
    $reqTask = $script:HttpClient.GetAsync($uri)
    Enqueue-HttpJob $reqTask {
        param($ok, $rawBody)
        $script:SyncInFlight = $false
        if (-not $ok -or [string]::IsNullOrWhiteSpace($rawBody)) {
            $script:CloudOnline = $false
            Update-StatusVisuals
            return
        }
        try {
            $data = $script:Json.DeserializeObject($rawBody)
            if ($data -and [bool]$data["ok"]) {
                if ($data.ContainsKey("serverTime")) {
                    $script:ClockOffsetMs = [int64]$data["serverTime"] - [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                }
                if ($data.ContainsKey("devices") -and $data["devices"]) {
                    $script:Devices = @($data["devices"])
                }
                if ($data.ContainsKey("tasks") -and $data["tasks"]) {
                    $nextTasks = @($data["tasks"])
                    $prevJ = $script:Json.Serialize($script:Tasks)
                    $nextJ = $script:Json.Serialize($nextTasks)
                    $script:Tasks = $nextTasks
                    $script:CloudOnline = $true
                    Save-Cache
                    if ($prevJ -ne $nextJ) { Render-All } else { Update-StatusVisuals }
                }
            }
        } catch {
            $script:CloudOnline = $false
            Update-StatusVisuals
        }
    }
}

function Trigger-CloudSync {
    if ($script:SyncInFlight -or $script:Exiting) { return }
    $script:SyncInFlight = $true

    if ($script:OfflineQueue.Count -gt 0) {
        $payload = $script:Json.Serialize(@{
            deviceId = $script:Config.DeviceId
            actions  = @($script:OfflineQueue)
        })
        $content = New-Object System.Net.Http.StringContent($payload, [System.Text.Encoding]::UTF8, "application/json")
        $reqTask = $script:HttpClient.PostAsync("$($script:Config.ApiBase)/api/sync-batch", $content)
        Enqueue-HttpJob $reqTask {
            param($ok, $rawBody)
            if ($ok) { $script:OfflineQueue.Clear(); Save-Cache }
            Pull-StateAsync
        }
    } else {
        Pull-StateAsync
    }
}

function Exit-Cleanly {
    $script:Exiting = $true
    try { $desktopGuardTimer.Stop(); $jobTimer.Stop(); $syncTimer.Stop(); $hbTimer.Stop(); $uiTimer.Stop() } catch {}
    Send-HeartbeatSync $script:Config.DeviceId $false
    $trayIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
}

[Microsoft.Win32.SystemEvents]::add_SessionEnding({
    $script:Exiting = $true
    Send-HeartbeatSync $script:Config.DeviceId $false
})

$form.Add_FormClosing({
    param($s, $e)
    if (-not $script:Exiting -and $e.CloseReason -eq [System.Windows.Forms.CloseReason]::UserClosing) {
        # Desktop widget stays pinned permanently until Exit Widget is chosen from tray
        $e.Cancel = $true
        $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
        Enforce-DesktopWidgetMode $true
        return
    }
    $script:Exiting = $true
    Send-HeartbeatSync $script:Config.DeviceId $false
})

Apply-AutoStart ([bool]$script:Config.AutoStart)
Load-Cache
Render-All

$jobTimer = New-Object System.Windows.Forms.Timer
$jobTimer.Interval = 80
$jobTimer.Add_Tick({
    if ($script:AsyncJobs.Count -eq 0) { return }
    for ($i = $script:AsyncJobs.Count - 1; $i -ge 0; $i--) {
        $job = $script:AsyncJobs[$i]
        $t = $job["task"]
        if ($t.IsCompleted) {
            $script:AsyncJobs.RemoveAt($i)
            $ok = $false
            $body = ""
            try {
                if (-not $t.IsFaulted -and -not $t.IsCanceled -and $null -ne $t.Result) {
                    $resp = $t.Result
                    $ok = $resp.IsSuccessStatusCode
                    $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                }
            } catch {
                $ok = $false
            }
            if ($null -ne $job["onDone"]) {
                & $job["onDone"] $ok $body
            }
        }
    }
})
$jobTimer.Start()

$syncTimer = New-Object System.Windows.Forms.Timer
$syncTimer.Interval = 5000
$syncTimer.Add_Tick({ Trigger-CloudSync })
$syncTimer.Start()

$hbTimer = New-Object System.Windows.Forms.Timer
$hbTimer.Interval = 20000
$hbTimer.Add_Tick({ Send-HeartbeatAsync $true })
$hbTimer.Start()

$uiTimer = New-Object System.Windows.Forms.Timer
$uiTimer.Interval = 4000
$uiTimer.Add_Tick({ Reanalyze-Status; Update-StatusVisuals })
$uiTimer.Start()

$desktopGuardTimer = New-Object System.Windows.Forms.Timer
$desktopGuardTimer.Interval = 1200
$desktopGuardTimer.Add_Tick({ Enforce-DesktopWidgetMode $false })
$desktopGuardTimer.Start()

Send-HeartbeatAsync $true
Trigger-CloudSync

[System.Windows.Forms.Application]::Run($form)
