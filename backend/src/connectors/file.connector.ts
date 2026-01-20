import { BaseConnector } from './base.connector';
import { ConnectorResult } from '../types';
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

/**
 * File Connector for local filesystem or S3-compatible storage
 * For MVP: local filesystem only
 */
export class FileConnector extends BaseConnector {
  id = 'file';
  name = 'File Storage Connector';
  capabilities: ('read' | 'write' | 'search')[] = ['read', 'write', 'search'];

  private basePath: string;

  constructor(basePath: string = './storage') {
    super();
    this.basePath = basePath;
    this.ensureBasePath();
  }

  private async ensureBasePath() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  async create(entity: string, data: any): Promise<ConnectorResult> {
    try {
      const id = nanoid();
      const entityPath = path.join(this.basePath, entity);

      await fs.mkdir(entityPath, { recursive: true });

      const filePath = path.join(entityPath, `${id}.json`);
      const record = {
        id,
        ...data,
        createdAt: new Date().toISOString(),
      };

      await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');

      return this.successResult(record);
    } catch (error: any) {
      return this.errorResult(`Failed to create file: ${error.message}`);
    }
  }

  async read(entity: string, id: string): Promise<ConnectorResult> {
    try {
      const filePath = path.join(this.basePath, entity, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const record = JSON.parse(content);

      return this.successResult(record);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return this.errorResult(`File not found: ${entity}/${id}`);
      }
      return this.errorResult(`Failed to read file: ${error.message}`);
    }
  }

  async update(entity: string, id: string, data: any): Promise<ConnectorResult> {
    try {
      const readResult = await this.read(entity, id);

      if (!readResult.success) {
        return readResult;
      }

      const existing = readResult.data;
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const filePath = path.join(this.basePath, entity, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');

      return this.successResult(updated);
    } catch (error: any) {
      return this.errorResult(`Failed to update file: ${error.message}`);
    }
  }

  async delete(entity: string, id: string): Promise<ConnectorResult> {
    try {
      const filePath = path.join(this.basePath, entity, `${id}.json`);
      await fs.unlink(filePath);

      return this.successResult({ deleted: true, id });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return this.errorResult(`File not found: ${entity}/${id}`);
      }
      return this.errorResult(`Failed to delete file: ${error.message}`);
    }
  }

  async search(entity: string, query: string): Promise<ConnectorResult[]> {
    try {
      const entityPath = path.join(this.basePath, entity);

      // Check if entity directory exists
      try {
        await fs.access(entityPath);
      } catch {
        return [];
      }

      const files = await fs.readdir(entityPath);
      const results: ConnectorResult[] = [];
      const lowerQuery = query.toLowerCase();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(entityPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content);

        // Simple text search across all fields
        const recordStr = JSON.stringify(record).toLowerCase();
        if (recordStr.includes(lowerQuery)) {
          results.push(this.successResult(record));
        }
      }

      return results;
    } catch (error: any) {
      console.error('File search error:', error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all files in an entity
   */
  async list(entity: string): Promise<ConnectorResult[]> {
    try {
      const entityPath = path.join(this.basePath, entity);
      const files = await fs.readdir(entityPath);
      const results: ConnectorResult[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(entityPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content);
        results.push(this.successResult(record));
      }

      return results;
    } catch (error) {
      return [];
    }
  }
}

export const fileConnector = new FileConnector();
