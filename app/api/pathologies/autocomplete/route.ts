import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'maladies_fr.txt');
    const fileContent = await readFile(filePath, 'utf-8');
    const suggestions = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Erreur de lecture du fichier des pathologies :', error);
    return NextResponse.json(
      { error: 'Impossible de charger les suggestions' },
      { status: 500 },
    );
  }
}
