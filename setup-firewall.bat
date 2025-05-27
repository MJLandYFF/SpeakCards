@echo off
echo 正在配置Windows防火墙以允许SpeakCards局域网访问...
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 检测到管理员权限，开始配置防火墙...
    
    :: 删除可能存在的旧规则
    netsh advfirewall firewall delete rule name="SpeakCards" >nul 2>&1
    
    :: 添加新的入站规则
    netsh advfirewall firewall add rule name="SpeakCards" dir=in action=allow protocol=TCP localport=3000
    
    if %errorLevel% == 0 (
        echo ✅ 防火墙规则添加成功！
        echo 📱 现在您可以通过局域网访问SpeakCards了
        echo 🌐 局域网地址: http://192.168.1.118:3000
    ) else (
        echo ❌ 防火墙规则添加失败
    )
) else (
    echo ❌ 需要管理员权限来配置防火墙
    echo 请右键点击此文件，选择"以管理员身份运行"
)

echo.
pause
