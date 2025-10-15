const fs = require('fs');
const path = require('path');

async function buildExtension() {
    console.log('🔨 Building Chrome Extension...\n');

    const outDir = path.join(__dirname, 'out');

    // 1. Copy manifest.json
    console.log('📋 Copying manifest.json...');
    const manifestSrc = path.join(__dirname, 'public', 'manifest.json');
    const manifestDest = path.join(outDir, 'manifest.json');
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('✅ Manifest copied\n');

    // 2. Copy icons
    console.log('🎨 Copying icons...');
    const iconsSrc = path.join(__dirname, 'public', 'icons');
    const iconsDest = path.join(outDir, 'icons');

    if (fs.existsSync(iconsSrc)) {
        if (!fs.existsSync(iconsDest)) {
            fs.mkdirSync(iconsDest, { recursive: true });
        }

        const icons = fs.readdirSync(iconsSrc);
        icons.forEach(icon => {
            fs.copyFileSync(
                path.join(iconsSrc, icon),
                path.join(iconsDest, icon)
            );
        });
        console.log('✅ Icons copied\n');
    } else {
        console.log('⚠️  No icons found - using defaults\n');
    }

    // 3. Rename _next to next (Chrome doesn't allow _ prefix)
    console.log('📦 Renaming _next folder...');
    const nextSrc = path.join(outDir, '_next');
    const nextDest = path.join(outDir, 'next');

    if (fs.existsSync(nextSrc)) {
        // Rename _next to next
        fs.renameSync(nextSrc, nextDest);
        console.log('✅ Renamed _next to next\n');
    } else {
        console.log('⚠️  _next folder not found\n');
    }

    // 4. Process popup.html
    console.log('📄 Processing popup.html...');
    const popupSrc = path.join(outDir, 'popup', 'index.html');
    const popupDest = path.join(outDir, 'popup.html');

    if (fs.existsSync(popupSrc)) {
        let htmlContent = fs.readFileSync(popupSrc, 'utf-8');

        // Replace all _next references with next
        htmlContent = htmlContent.replace(/\/_next/g, '/next');
        htmlContent = htmlContent.replace(/"_next/g, '"next');
        htmlContent = htmlContent.replace(/'_next/g, "'next");

        // Fix paths to be relative
        htmlContent = htmlContent.replace(/href="\/next/g, 'href="./next');
        htmlContent = htmlContent.replace(/src="\/next/g, 'src="./next');
        htmlContent = htmlContent.replace(/href="\//g, 'href="./');
        htmlContent = htmlContent.replace(/src="\//g, 'src="./');

        fs.writeFileSync(popupDest, htmlContent);
        console.log('✅ Popup HTML processed\n');
    } else {
        console.error('❌ popup/index.html not found!');
        console.log('Run "npm run build" first\n');
        process.exit(1);
    }

    // 5. Process all CSS files
    console.log('🎨 Processing CSS files...');
    const nextDir = path.join(outDir, 'next');

    if (fs.existsSync(nextDir)) {
        processDirectory(nextDir, (filePath) => {
            if (filePath.endsWith('.css')) {
                let content = fs.readFileSync(filePath, 'utf-8');
                content = content.replace(/\/_next/g, '/next');
                content = content.replace(/"_next/g, '"next');
                fs.writeFileSync(filePath, content);
            }
        });
        console.log('✅ CSS files processed\n');
    }

    // 6. Process all JS files
    console.log('⚙️  Processing JS files...');
    if (fs.existsSync(nextDir)) {
        processDirectory(nextDir, (filePath) => {
            if (filePath.endsWith('.js')) {
                let content = fs.readFileSync(filePath, 'utf-8');
                content = content.replace(/\/_next/g, '/next');
                content = content.replace(/"_next/g, '"next');
                content = content.replace(/'_next/g, "'next");
                fs.writeFileSync(filePath, content);
            }
        });
        console.log('✅ JS files processed\n');
    }

    // 7. Create background.js
    console.log('⚙️  Creating background.js...');
    const backgroundJs = `
// Background Service Worker
console.log('🎙️ Podcast Extension: Background worker loaded');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension clicked on:', tab.url);
});

console.log('🎙️ Background worker ready');
`;

    fs.writeFileSync(path.join(outDir, 'background.js'), backgroundJs);
    console.log('✅ Background worker created\n');

    // 8. Clean up popup directory
    const popupDir = path.join(outDir, 'popup');
    if (fs.existsSync(popupDir)) {
        fs.rmSync(popupDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up popup directory\n');
    }

    // 9. Verify build
    console.log('🔍 Verifying build...');
    const criticalFiles = [
        'popup.html',
        'manifest.json',
        'background.js',
        'next'
    ];

    let allGood = true;
    criticalFiles.forEach(file => {
        const exists = fs.existsSync(path.join(outDir, file));
        if (exists) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} MISSING!`);
            allGood = false;
        }
    });

    if (allGood) {
        console.log('\n🎉 Extension build complete!');
        console.log('📦 Extension ready in "out" directory');
        console.log('\n📝 Next steps:');
        console.log('1. Go to chrome://extensions/');
        console.log('2. Remove old extension if loaded');
        console.log('3. Enable Developer Mode');
        console.log('4. Click "Load unpacked"');
        console.log('5. Select the "out" directory\n');
    } else {
        console.error('\n❌ Build incomplete');
        process.exit(1);
    }
}

// Helper function to process directory recursively
function processDirectory(dir, callback) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath, callback);
        } else {
            callback(filePath);
        }
    });
}

buildExtension().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});