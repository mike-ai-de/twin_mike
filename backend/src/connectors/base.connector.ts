import { IConnector, ConnectorResult } from '../types';

/**
 * Base abstract connector class
 * All connectors must extend this class
 */
export abstract class BaseConnector implements IConnector {
  abstract id: string;
  abstract name: string;
  abstract capabilities: ('read' | 'write' | 'search' | 'webhook')[];

  abstract create(entity: string, data: any): Promise<ConnectorResult>;
  abstract read(entity: string, id: string): Promise<ConnectorResult>;
  abstract update(entity: string, id: string, data: any): Promise<ConnectorResult>;
  abstract delete(entity: string, id: string): Promise<ConnectorResult>;
  abstract search(entity: string, query: string): Promise<ConnectorResult[]>;
  abstract healthCheck(): Promise<boolean>;

  protected successResult<T>(data: T): ConnectorResult<T> {
    return {
      success: true,
      data,
    };
  }

  protected errorResult(error: string): ConnectorResult {
    return {
      success: false,
      error,
    };
  }
}
