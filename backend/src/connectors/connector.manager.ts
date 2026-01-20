import { IConnector, ConnectorResult } from '../types';
import { mockConnector } from './mock.connector';
import { fileConnector } from './file.connector';

/**
 * Connector Manager
 * Central registry and router for all connectors
 */
export class ConnectorManager {
  private connectors: Map<string, IConnector> = new Map();

  constructor() {
    // Register built-in connectors
    this.register(mockConnector);
    this.register(fileConnector);
  }

  /**
   * Register a new connector
   */
  register(connector: IConnector): void {
    this.connectors.set(connector.id, connector);
    console.log(`✓ Registered connector: ${connector.name} (${connector.id})`);
  }

  /**
   * Get connector by ID
   */
  get(connectorId: string): IConnector | undefined {
    return this.connectors.get(connectorId);
  }

  /**
   * List all registered connectors
   */
  list(): IConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Execute operation on a connector
   */
  async execute(
    connectorId: string,
    operation: 'create' | 'read' | 'update' | 'delete' | 'search',
    entity: string,
    ...args: any[]
  ): Promise<ConnectorResult | ConnectorResult[]> {
    const connector = this.connectors.get(connectorId);

    if (!connector) {
      return {
        success: false,
        error: `Connector not found: ${connectorId}`,
      };
    }

    // Check if connector supports the operation
    if (operation === 'search' && !connector.capabilities.includes('search')) {
      return {
        success: false,
        error: `Connector ${connectorId} does not support search`,
      };
    }

    if (['create', 'update', 'delete'].includes(operation) && !connector.capabilities.includes('write')) {
      return {
        success: false,
        error: `Connector ${connectorId} does not support write operations`,
      };
    }

    if (operation === 'read' && !connector.capabilities.includes('read')) {
      return {
        success: false,
        error: `Connector ${connectorId} does not support read operations`,
      };
    }

    try {
      switch (operation) {
        case 'create':
          return await connector.create(entity, args[0]);
        case 'read':
          return await connector.read(entity, args[0]);
        case 'update':
          return await connector.update(entity, args[0], args[1]);
        case 'delete':
          return await connector.delete(entity, args[0]);
        case 'search':
          return await connector.search(entity, args[0]);
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Connector execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Health check all connectors
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [id, connector] of this.connectors.entries()) {
      try {
        results[id] = await connector.healthCheck();
      } catch {
        results[id] = false;
      }
    }

    return results;
  }
}

export const connectorManager = new ConnectorManager();
