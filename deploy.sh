#!/bin/bash
# SpeakCards 部署脚本 - 部署到 GitHub Pages

echo "🚀 开始部署 SpeakCards 到 GitHub Pages..."

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 发现未提交的更改，正在提交..."
    git add .
    git commit -m "Auto deploy: $(date '+%Y%m%d-%H%M%S')"
fi

# 推送到 GitHub
echo "📤 推送代码到 GitHub..."
git push origin master --tags

echo "✅ 代码推送完成！"
echo ""
echo "📱 手机访问地址："
echo "https://mjlandyff.github.io/SpeakCards/"
echo ""
echo "⚙️  请在 GitHub 仓库设置中启用 Pages："
echo "1. 访问: https://github.com/MJLandYFF/SpeakCards/settings/pages"
echo "2. Source 选择: Deploy from a branch"
echo "3. Branch 选择: master"
echo "4. Folder 选择: / (root)"
echo "5. 点击 Save"
echo ""
echo "🎉 部署完成！等待 1-2 分钟后即可通过手机访问"