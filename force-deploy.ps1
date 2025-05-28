# GitHub Pages 强制部署脚本
Write-Host "🔥 强制重新部署到GitHub Pages..." -ForegroundColor Red

# 切换到gh-pages分支
git checkout gh-pages

# 创建一个新的空提交来触发部署
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit --allow-empty -m "强制重新部署 - $timestamp"

# 推送到远程仓库
git push origin gh-pages

# 切换回master分支
git checkout master

Write-Host "✅ 强制部署完成！" -ForegroundColor Green
Write-Host "🌐 请访问: https://mjlandyff.github.io/SpeakCards/" -ForegroundColor Cyan
Write-Host "⏳ 等待3-5分钟让GitHub处理部署..." -ForegroundColor Yellow
