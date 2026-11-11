Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\MidasTaskWidget.ps1"

argDev = ""
If WScript.Arguments.Count > 0 Then
    argDev = " -Device """ & WScript.Arguments(0) & """"
End If

cmd = "powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & psScript & """" & argDev
shell.Run cmd, 0, False
