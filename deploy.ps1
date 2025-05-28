# SpeakCards 部署脚本 - PowerShell版本
# 部署到 GitHub Pages 让手机远程访问

Write-Host "🚀 开始部署 SpeakCards 到 GitHub Pages..." -ForegroundColor Green

# 检查是否有未提交的更改
$status = git status --porcelain
if ($status) {
    Write-Host "📝 发现未提交的更改，正在提交..." -ForegroundColor Yellow
    git add .
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    git commit -m "Auto deploy: $timestamp"
}

# 推送到 GitHub
Write-Host "📤 推送代码到 GitHub..." -ForegroundColor Blue
git push origin master --tags

# 更新 gh-pages 分支
Write-Host "🔄 更新 gh-pages 分支..." -ForegroundColor Blue
git checkout gh-pages
git merge master
git push origin gh-pages
git checkout master

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 代码推送完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 手机访问地址：" -ForegroundColor Cyan
    Write-Host "https://mjlandyff.github.io/SpeakCards/" -ForegroundColor White
    Write-Host ""
    Write-Host "⚙️  请在 GitHub 仓库设置中启用 Pages：" -ForegroundColor Yellow
    Write-Host "1. 访问: https://github.com/MJLandYFF/SpeakCards/settings/pages"
    Write-Host "2. Source 选择: Deploy from a branch"
    Write-Host "3. Branch 选择: master"
    Write-Host "4. Folder 选择: / (root)"
    Write-Host "5. 点击 Save"
    Write-Host ""
    Write-Host "🎉 部署完成！等待 1-2 分钟后即可通过手机访问" -ForegroundColor Green
} else {
    Write-Host "❌ 推送失败，请检查网络连接和仓库权限" -ForegroundColor Red
}
