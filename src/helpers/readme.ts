import path from 'path';
import fs from 'fs/promises';

export async function generateREADME(folderpath: string) {
    const readme_md = [
        '# Swagme',
    ].join('\n')
    await fs.writeFile(path.join(folderpath, 'README.md'), readme_md, 'utf-8');
}