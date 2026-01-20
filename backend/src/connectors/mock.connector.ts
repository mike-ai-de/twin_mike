import { BaseConnector } from './base.connector';
import { ConnectorResult } from '../types';

/**
 * Mock Connector for testing
 * Returns dummy data without external dependencies
 */
export class MockConnector extends BaseConnector {
  id = 'mock';
  name = 'Mock Connector';
  capabilities: ('read' | 'write' | 'search')[] = ['read', 'write', 'search'];

  private storage: Map<string, Map<string, any>> = new Map();

  async create(entity: string, data: any): Promise<ConnectorResult> {
    if (!this.storage.has(entity)) {
      this.storage.set(entity, new Map());
    }

    const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = { id, ...data, createdAt: new Date().toISOString() };

    this.storage.get(entity)!.set(id, record);

    return this.successResult(record);
  }

  async read(entity: string, id: string): Promise<ConnectorResult> {
    const entityStorage = this.storage.get(entity);

    if (!entityStorage || !entityStorage.has(id)) {
      return this.errorResult(`Record not found: ${entity}/${id}`);
    }

    return this.successResult(entityStorage.get(id));
  }

  async update(entity: string, id: string, data: any): Promise<ConnectorResult> {
    const entityStorage = this.storage.get(entity);

    if (!entityStorage || !entityStorage.has(id)) {
      return this.errorResult(`Record not found: ${entity}/${id}`);
    }

    const existing = entityStorage.get(id);
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };

    entityStorage.set(id, updated);

    return this.successResult(updated);
  }

  async delete(entity: string, id: string): Promise<ConnectorResult> {
    const entityStorage = this.storage.get(entity);

    if (!entityStorage || !entityStorage.has(id)) {
      return this.errorResult(`Record not found: ${entity}/${id}`);
    }

    entityStorage.delete(id);

    return this.successResult({ deleted: true, id });
  }

  async search(entity: string, query: string): Promise<ConnectorResult[]> {
    const entityStorage = this.storage.get(entity);

    if (!entityStorage) {
      return [];
    }

    const results: ConnectorResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [id, record] of entityStorage.entries()) {
      const recordStr = JSON.stringify(record).toLowerCase();
      if (recordStr.includes(lowerQuery)) {
        results.push(this.successResult(record));
      }
    }

    return results;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Helper: Seed with mock data
  seedMockData() {
    // Mock calendar events
    this.create('calendar_event', {
      title: 'Team Meeting',
      start: '2024-01-20T10:00:00Z',
      end: '2024-01-20T11:00:00Z',
      description: 'Weekly team sync',
    });

    this.create('calendar_event', {
      title: 'Client Call',
      start: '2024-01-21T14:00:00Z',
      end: '2024-01-21T15:00:00Z',
      description: 'Q1 planning with Acme Corp',
    });

    // Mock files
    this.create('file', {
      name: 'Q4_Report.pdf',
      path: '/documents/reports/Q4_Report.pdf',
      size: 1024000,
      mimeType: 'application/pdf',
    });

    this.create('file', {
      name: 'Sales_Playbook.docx',
      path: '/documents/playbooks/Sales_Playbook.docx',
      size: 512000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
}

export const mockConnector = new MockConnector();
