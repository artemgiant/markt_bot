#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Конфігурація
const config = {
    outputFile: 'Architecture.md',

    // Папки та файли для ігнорування
    ignore: [
        'node_modules',
        '.git',
        '.next',
        'dist',
        'build',
        '.cache',
        'coverage',
        '.vscode',
        '.idea',
        'logs',
        '*.log',
        '.DS_Store',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'Architecture.md' // не включаємо сам файл архітектури
    ],

    // Типи файлів та їх опис
    fileTypes: {
        config: {
            extensions: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config.js', '.config.ts'],
            icon: '⚙️',
            description: 'Конфігураційний файл'
        },
        code: {
            extensions: ['.js', '.ts', '.jsx', '.tsx'],
            icon: '📄',
            description: 'Код'
        },
        style: {
            extensions: ['.css', '.scss', '.sass', '.less', '.styl'],
            icon: '🎨',
            description: 'Стилі'
        },
        doc: {
            extensions: ['.md', '.txt', '.pdf', '.doc', '.docx'],
            icon: '📝',
            description: 'Документація'
        },
        markup: {
            extensions: ['.html', '.xml', '.svg'],
            icon: '🌐',
            description: 'Розмітка'
        },
        image: {
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg'],
            icon: '🖼️',
            description: 'Зображення'
        },
        data: {
            extensions: ['.json', '.csv', '.xlsx', '.sql', '.db'],
            icon: '💾',
            description: 'Дані'
        },
        test: {
            extensions: ['.test.js', '.test.ts', '.spec.js', '.spec.ts'],
            icon: '🧪',
            description: 'Тести'
        }
    },

    // Спеціальні файли
    specialFiles: {
        'package.json': { icon: '📦', description: 'NPM конфігурація та залежності' },
        'README.md': { icon: '📖', description: 'Головна документація проекту' },
        'tsconfig.json': { icon: '🔧', description: 'TypeScript конфігурація' },
        '.gitignore': { icon: '🚫', description: 'Git ignore правила' },
        'Dockerfile': { icon: '🐳', description: 'Docker конфігурація' },
        'docker-compose.yml': { icon: '🐳', description: 'Docker Compose конфігурація' },
        '.env': { icon: '🔐', description: 'Змінні оточення' },
        'webpack.config.js': { icon: '📦', description: 'Webpack конфігурація' },
        'next.config.js': { icon: '⚡', description: 'Next.js конфігурація' },
        'vite.config.js': { icon: '⚡', description: 'Vite конфігурація' }
    },

    // Опис популярних папок
    folderDescriptions: {
        'src': 'Вихідний код проекту',
        'public': 'Публічні статичні файли',
        'components': 'React/Vue компоненти',
        'pages': 'Сторінки додатку',
        'api': 'API маршрути та логіка',
        'utils': 'Допоміжні утиліти та функції',
        'hooks': 'React hooks',
        'styles': 'Стилі проекту',
        'assets': 'Ресурси (зображення, шрифти)',
        'lib': 'Бібліотеки та модулі',
        'config': 'Конфігураційні файли',
        'tests': 'Тести',
        'docs': 'Документація',
        'scripts': 'Скрипти для автоматизації',
        'types': 'TypeScript типи та інтерфейси',
        'models': 'Моделі даних',
        'services': 'Сервіси та бізнес-логіка',
        'middlewares': 'Middleware функції',
        'routes': 'Маршрути',
        'controllers': 'Контролери',
        'views': 'Шаблони відображення'
    }
};

// Перевірка чи потрібно ігнорувати
function shouldIgnore(name) {
    return config.ignore.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(name);
        }
        return name === pattern;
    });
}

// Отримати інформацію про файл
function getFileInfo(filename) {
    // Спеціальні файли
    if (config.specialFiles[filename]) {
        return config.specialFiles[filename];
    }

    // Тести
    if (filename.includes('.test.') || filename.includes('.spec.')) {
        return { icon: '🧪', description: 'Тестовий файл' };
    }

    // За розширенням
    const ext = path.extname(filename).toLowerCase();
    for (const [type, info] of Object.entries(config.fileTypes)) {
        if (info.extensions.some(e => filename.endsWith(e) || ext === e)) {
            return { icon: info.icon, description: info.description };
        }
    }

    return { icon: '📄', description: 'Файл' };
}

// Отримати статистику
function getStats(dirPath, stats = { files: 0, dirs: 0, size: 0, types: {} }) {
    try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            if (shouldIgnore(item)) continue;

            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                stats.dirs++;
                getStats(fullPath, stats);
            } else {
                stats.files++;
                stats.size += stat.size;

                const ext = path.extname(item) || 'без розширення';
                stats.types[ext] = (stats.types[ext] || 0) + 1;
            }
        }
    } catch (err) {
        // Ігнорувати помилки
    }

    return stats;
}

// Форматувати розмір
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Побудувати дерево для Markdown
function buildMarkdownTree(dirPath, prefix = '', isLast = true, maxDepth = Infinity, currentDepth = 0, projectRoot = dirPath) {
    if (currentDepth > maxDepth) return '';

    const name = path.basename(dirPath);
    const isDir = fs.statSync(dirPath).isDirectory();
    const fileInfo = isDir
        ? { icon: '📁', description: config.folderDescriptions[name] || '' }
        : getFileInfo(name);

    let output = '';

    if (currentDepth > 0) {
        const indent = '  '.repeat(currentDepth - 1);
        const symbol = isLast ? '└── ' : '├── ';
        output += `${indent}${symbol}${fileInfo.icon} **${name}**`;

        if (fileInfo.description) {
            output += ` — *${fileInfo.description}*`;
        }

        output += '\n';
    } else {
        output += `${fileInfo.icon} **${name}**\n`;
    }

    if (!isDir) return output;

    try {
        const items = fs.readdirSync(dirPath)
            .filter(item => !shouldIgnore(item))
            .sort((a, b) => {
                const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
                const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();

                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });

        items.forEach((item, index) => {
            const fullPath = path.join(dirPath, item);
            const isLastItem = index === items.length - 1;

            output += buildMarkdownTree(fullPath, prefix, isLastItem, maxDepth, currentDepth + 1, projectRoot);
        });
    } catch (err) {
        // Ігнорувати помилки
    }

    return output;
}

// Знайти package.json та прочитати інформацію
function getProjectInfo(dirPath) {
    const packageJsonPath = path.join(dirPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return {
                name: packageJson.name || path.basename(dirPath),
                version: packageJson.version || 'N/A',
                description: packageJson.description || '',
                dependencies: Object.keys(packageJson.dependencies || {}),
                devDependencies: Object.keys(packageJson.devDependencies || {})
            };
        } catch (err) {
            // Якщо помилка парсингу
        }
    }

    return {
        name: path.basename(dirPath),
        version: 'N/A',
        description: '',
        dependencies: [],
        devDependencies: []
    };
}

// Генерувати Architecture.md
function generateArchitectureMd(targetPath, maxDepth = Infinity) {
    const projectInfo = getProjectInfo(targetPath);
    const stats = getStats(targetPath);
    const tree = buildMarkdownTree(targetPath, '', true, maxDepth);
    const timestamp = new Date().toLocaleString('uk-UA');

    let markdown = `# 🏗️ Архітектура Проекту

> **Згенеровано автоматично:** ${timestamp}

---

## 📊 Загальна Інформація

| Параметр | Значення |
|----------|----------|
| **Назва проекту** | ${projectInfo.name} |
| **Версія** | ${projectInfo.version} |
| **Всього файлів** | ${stats.files} |
| **Всього папок** | ${stats.dirs} |
| **Загальний розмір** | ${formatSize(stats.size)} |
`;

    if (projectInfo.description) {
        markdown += `| **Опис** | ${projectInfo.description} |\n`;
    }

    markdown += `
---

## 📁 Структура Проекту

\`\`\`
${tree.trim()}
\`\`\`

---

## 📈 Статистика Файлів

### Розподіл за типами

`;

    // Топ типів файлів
    const topTypes = Object.entries(stats.types)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    markdown += '| Тип файлу | Кількість | Відсоток |\n';
    markdown += '|-----------|-----------|----------|\n';

    topTypes.forEach(([ext, count]) => {
        const percentage = ((count / stats.files) * 100).toFixed(1);
        markdown += `| \`${ext}\` | ${count} | ${percentage}% |\n`;
    });

    // Залежності
    if (projectInfo.dependencies.length > 0) {
        markdown += `\n---\n\n## 📦 Основні Залежності\n\n`;
        markdown += `Всього: **${projectInfo.dependencies.length}**\n\n`;

        const topDeps = projectInfo.dependencies.slice(0, 15);
        markdown += '| Пакет |\n|-------|\n';
        topDeps.forEach(dep => {
            markdown += `| \`${dep}\` |\n`;
        });

        if (projectInfo.dependencies.length > 15) {
            markdown += `\n*...і ще ${projectInfo.dependencies.length - 15} залежностей*\n`;
        }
    }

    // Dev залежності
    if (projectInfo.devDependencies.length > 0) {
        markdown += `\n---\n\n## 🛠️ Dev Залежності\n\n`;
        markdown += `Всього: **${projectInfo.devDependencies.length}**\n\n`;

        const topDevDeps = projectInfo.devDependencies.slice(0, 15);
        markdown += '| Пакет |\n|-------|\n';
        topDevDeps.forEach(dep => {
            markdown += `| \`${dep}\` |\n`;
        });

        if (projectInfo.devDependencies.length > 15) {
            markdown += `\n*...і ще ${projectInfo.devDependencies.length - 15} dev залежностей*\n`;
        }
    }

    markdown += `\n---\n\n## 📝 Легенда\n\n`;
    markdown += '| Іконка | Тип | Опис |\n';
    markdown += '|--------|-----|------|\n';
    markdown += '| 📁 | Папка | Директорія з файлами |\n';
    markdown += '| 📄 | Код | JavaScript/TypeScript файли |\n';
    markdown += '| ⚙️ | Конфіг | Конфігураційні файли |\n';
    markdown += '| 🎨 | Стилі | CSS/SCSS файли |\n';
    markdown += '| 📝 | Документація | Markdown та текстові файли |\n';
    markdown += '| 🧪 | Тести | Тестові файли |\n';
    markdown += '| 🖼️ | Медіа | Зображення та медіа файли |\n';
    markdown += '| 📦 | Пакет | package.json та подібні |\n';

    markdown += `\n---\n\n`;
    markdown += `*Цей файл згенеровано автоматично. Для оновлення запустіть:*\n\n`;
    markdown += '```bash\n';
    markdown += 'node generate-architecture.js\n';
    markdown += '```\n';

    return markdown;
}

// Головна функція
function main() {
    const args = process.argv.slice(2);
    const targetPath = args[0] || process.cwd();
    const maxDepth = args[1] ? parseInt(args[1]) : Infinity;
    const outputPath = path.join(targetPath, config.outputFile);

    console.log('🏗️  Генерація Architecture.md...\n');
    console.log(`📂 Сканування: ${targetPath}`);

    if (maxDepth !== Infinity) {
        console.log(`🔢 Глибина: ${maxDepth}`);
    }

    try {
        const markdown = generateArchitectureMd(targetPath, maxDepth);
        fs.writeFileSync(outputPath, markdown, 'utf8');

        console.log(`\n✅ Файл успішно створено: ${outputPath}`);
        console.log(`📊 Розмір: ${formatSize(Buffer.byteLength(markdown, 'utf8'))}`);

        const stats = getStats(targetPath);
        console.log(`\n📈 Статистика:`);
        console.log(`   📁 Папок: ${stats.dirs}`);
        console.log(`   📄 Файлів: ${stats.files}`);
        console.log(`   💾 Розмір: ${formatSize(stats.size)}`);

    } catch (err) {
        console.error('❌ Помилка:', err.message);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { generateArchitectureMd, getStats };