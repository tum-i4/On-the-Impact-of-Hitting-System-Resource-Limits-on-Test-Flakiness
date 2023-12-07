export interface JsonFormat {
	[timestamp: number]: TimedMeasurement;
}

export interface Measurement {
	userLoad: number;
	systemLoad: number;
	totalLoad: number;
	activeMemory: number;
	availableMemory: number;
	networkRead: number;
	networkWrite: number;
	diskRead: number;
	diskWrite: number;
}

export interface TimedMeasurement extends Measurement {
	isoString: string;
}

export interface TimedTestCaseIteration {
	startTime: number;
	endTime: number;
	failed: boolean;
}

export interface TimedTestCaseIterationsMap {
	[testCaseName: string]: {
		[iteration: string]: TimedTestCaseIteration;
	};
}

export interface AggregatedTestCaseIterationWithMeasurements {
	measurements: Measurement[];
	failed: boolean;
}

export interface AggregatedTestCaseWithMeasurementsMap {
	[testCase: string]: {
		[iteration: string]: AggregatedTestCaseIterationWithMeasurements;
	};
}

export interface Iterations {
	[iteration: string]: Measurement[];
}

export interface AggregatedTestCaseWithFlakiness {
    testCase: string;
	commit: string;
	failed_count: number;
	passed_count: number;
	failed_iterations: Iterations;
	passed_iterations: Iterations;
	fail_rate: number;
	flip_rate: number;
	entropy: number;
}
