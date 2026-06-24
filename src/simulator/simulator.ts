import pino from 'pino';
import { TwcFullStatus } from '../types/twc';
import { generateVitals, generateLifetime, generateWifiStatus, generateVersion } from './fake-data';
import { ScenarioType, getScenario, pickNextScenario } from './scenarios';

const logger = pino({ name: 'simulator' });

export interface SimulationConfig {
  enabled: boolean;
  connector_count: number;
  scenario_interval_s: number;
  fault_probability: number;
}

interface SimulatedConnector {
  name: string;
  host: string;
  scenario: ScenarioType;
  scenarioStartedAt: number;
  lifetime: ReturnType<typeof generateLifetime>;
}

export class Simulator {
  private connectors: SimulatedConnector[] = [];
  private config: SimulationConfig;

  constructor(config: SimulationConfig) {
    this.config = config;

    const names = [
      'Garage Bay 1', 'Garage Bay 2', 'Parking Lot A', 'Parking Lot B',
      'Loading Dock', 'Executive Parking', 'Visitor Spot 1', 'Visitor Spot 2',
      'Basement P1', 'Basement P2',
    ];

    for (let i = 0; i < config.connector_count; i++) {
      this.connectors.push({
        name: names[i % names.length] + (i >= names.length ? ` (${Math.floor(i / names.length) + 1})` : ''),
        host: `192.168.1.${100 + i}`,
        scenario: pickNextScenario(config.fault_probability),
        scenarioStartedAt: Date.now() - Math.random() * config.scenario_interval_s * 1000,
        lifetime: generateLifetime(),
      });
    }

    logger.info({ connectorCount: config.connector_count }, 'Simulator initialized');
  }

  /** Get the list of simulated connector configs (name + host) */
  getConnectorConfigs(): { name: string; host: string; enabled: boolean }[] {
    return this.connectors.map(c => ({ name: c.name, host: c.host, enabled: true }));
  }

  /** Poll a single simulated connector, returning its current state */
  poll(host: string): TwcFullStatus {
    const connector = this.connectors.find(c => c.host === host);
    if (!connector) {
      return {
        vitals: null, lifetime: null, wifi: null, version: null,
        online: false, lastSeen: null, consecutiveMisses: 99,
      };
    }

    // Check if scenario should transition
    const elapsed = (Date.now() - connector.scenarioStartedAt) / 1000;
    if (elapsed >= this.config.scenario_interval_s) {
      const previous = connector.scenario;
      connector.scenario = pickNextScenario(this.config.fault_probability);
      connector.scenarioStartedAt = Date.now();
      if (connector.scenario !== previous) {
        logger.debug({ device: connector.name, from: previous, to: connector.scenario }, 'Scenario transition');
      }
    }

    const scenarioElapsed = (Date.now() - connector.scenarioStartedAt) / 1000;
    const scenario = getScenario(connector.scenario);

    if (!scenario.online) {
      return {
        vitals: null, lifetime: null, wifi: null, version: null,
        online: false, lastSeen: new Date(Date.now() - 90000),
        consecutiveMisses: Math.ceil(scenarioElapsed / 30) + 1,
      };
    }

    const overrides = scenario.getOverrides(scenarioElapsed);
    const idx = this.connectors.indexOf(connector);

    return {
      vitals: generateVitals(overrides),
      lifetime: connector.lifetime,
      wifi: generateWifiStatus(idx),
      version: generateVersion(idx),
      online: true,
      lastSeen: new Date(),
      consecutiveMisses: 0,
    };
  }

  /** Poll all simulated connectors */
  pollAll(): Map<string, TwcFullStatus> {
    const results = new Map<string, TwcFullStatus>();
    for (const connector of this.connectors) {
      results.set(connector.host, this.poll(connector.host));
    }
    return results;
  }
}
