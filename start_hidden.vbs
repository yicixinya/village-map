Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell -ExecutionPolicy Bypass -File """ & folder & "\server.ps1""", 0, False
WScript.Sleep 4000
Dim ip
On Error Resume Next
Set f = fso.OpenTextFile(folder & "\ip.txt", 1)
ip = f.ReadAll
f.Close
On Error Goto 0
If ip = "" Then ip = "see ip.txt in project folder"
MsgBox "Server started in background." & vbCrLf & vbCrLf & "Local: " & ip & vbCrLf & "Cpolar: https://6c8eb06a.r21.vip.cpolar.cn" & vbCrLf & vbCrLf & "To STOP: open Task Manager -> end powershell process", vbInformation, "Village Map Server"