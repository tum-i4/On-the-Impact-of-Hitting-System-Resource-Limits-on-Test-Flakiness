import {
	AggregatedTestCaseWithFlakiness,
	AggregatedTestCaseWithMeasurementsMap,
	Iterations,
	JsonFormat,
	Measurement,
	TimedTestCaseIterationsMap,
} from "./types";

export function getStartAndEndTimeOfTestCasesInLog(logLines: string[]): TimedTestCaseIterationsMap {
	let testCases: TimedTestCaseIterationsMap = {};
	let testSuiteStarted = false;
	let testCaseStarted = false;
	let testCaseName = "";
	let startTime = 0;
	let iteration = 0;
	for (let i = 0; i < logLines.length; i++) {
		if (logLines[i].includes("Test Suite")) {
			testSuiteStarted = true;
		}
		if (testSuiteStarted) {
			let line = logLines[i];
			if (line.includes("Test Case") && line.includes("started")) {
				testCaseStarted = true;
				iteration = parseInt(line.split("started (Iteration ")[1].split(" of")[0]);
				testCaseName = line.split("Test Case ")[1].split(" started")[0];
				startTime = Date.parse(line.split(" Test Case ")[0]);
				// console.log(testCaseName + " started at " + startTime + " (Iteration " + iteration + ")");
				continue;
			}
			if (testCaseStarted) {
				if ((line.includes("passed") || line.includes("failed")) && line.includes("Test Case")) {
					let failed = line.includes("failed");
					// test finished
					testCaseStarted = false;
					let endTime = Date.parse(line.split(" Test Case ")[0]);
					// check if endTime parsing failed
					if (isNaN(endTime)) {
						console.error("Failed to parse endTime for testCase " + testCaseName + " at line " + (i + 1) + ": " + line);
						continue;
					}
					if (!testCases[testCaseName]) {
						testCases[testCaseName] = {};
					}
					testCases[testCaseName][iteration] = {
						startTime: startTime,
						endTime: endTime,
						failed: failed,
					};
				}
			}
		}
	}
	return testCases;
}

function orderStatsByTimestamp(stats: JsonFormat): JsonFormat {
	let orderedStats: JsonFormat = {};
	console.log("Ordering stats by timestamp...")
	Object.keys(stats).sort().forEach(function (key) {
		orderedStats[parseInt(key)] = stats[parseInt(key)];
	});
	console.log("Finished ordering stats by timestamp.\n")
	return orderedStats;
}


export function aggregateMeasurementsByTestCase(testCases: TimedTestCaseIterationsMap, stats: JsonFormat): AggregatedTestCaseWithMeasurementsMap {
	let aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap = {};
	// order stats by timestamp
	let orderedStats = orderStatsByTimestamp(stats);
	let maxTimestamp = parseInt(Object.keys(orderedStats)[Object.keys(orderedStats).length - 1]);
	let currentTimestamp = parseInt(Object.keys(orderedStats)[0]);
	// print as many # as there are test cases
	console.log("#".repeat(Object.keys(testCases).length))
	Object.entries(testCases).forEach(([testCaseName, testCaseIterations]) => {
		Object.entries(testCaseIterations).forEach(([iteration, testCase]) => {
			let start = testCase.startTime;
			let end = testCase.endTime;
			let iterationGotThere = true;
			
			// skip to start
			for (; currentTimestamp < maxTimestamp && currentTimestamp < start; currentTimestamp++) {
			}

			for (; currentTimestamp < maxTimestamp && currentTimestamp <= end; currentTimestamp++) {
				iterationGotThere = true
				// if currentTimestamp is in keys of orderedStats
				if (!orderedStats[currentTimestamp]) {
					continue;
				}
				let measurement = orderedStats[currentTimestamp];
				if (!aggregatedMeasurementsByTestCase[testCaseName]) {
					aggregatedMeasurementsByTestCase[testCaseName] = {};
				}
				if (aggregatedMeasurementsByTestCase[testCaseName][iteration]) {
					aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements.push(measurement as Measurement);
				} else {
					aggregatedMeasurementsByTestCase[testCaseName][iteration] = {
						measurements: [measurement as Measurement],
						failed: testCase.failed,
					};
					if (aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements === undefined) {
						aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements = [];
					}
				}
			}
			if (!iterationGotThere) { // can happen if the test case is too fast and the measurements frequency is too low
				console.error("Failed to find measurements for testCase\t" + testCaseName + " iteration " + iteration + " between " + start + " and " + end + " duration: " + (end - start) + "ms");
				if (!aggregatedMeasurementsByTestCase[testCaseName]) {
					aggregatedMeasurementsByTestCase[testCaseName] = {};
				}
				aggregatedMeasurementsByTestCase[testCaseName][iteration] = {
					measurements: [],
					failed: testCase.failed,
				}
			}
		});
		process.stdout.write("#")
	});
	return aggregatedMeasurementsByTestCase;
}

export function calculateFlakiness(
	aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap, 
	aggregatedTestCaseWithMeasurementsMap: AggregatedTestCaseWithMeasurementsMap,
	commit: string
): AggregatedTestCaseWithFlakiness[] {
	let aggregatedTestCasesWithFlakiness: AggregatedTestCaseWithFlakiness[] = [];
	Object.entries(aggregatedTestCaseWithMeasurementsMap).forEach(([testCaseName, testCase]) => {
		let prevStatus: Boolean = null;
		let failed_count = 0;
		let passed_count = 0;
		let failed_iterations: Iterations = {};
		let passed_iterations: Iterations = {};
		let runs = 0;
		let flips = 0;
		Object.entries(testCase).forEach(([iteration, testCaseIteration]) => {
			// fail rate
			if (testCaseIteration.failed) {
				failed_count++;
				failed_iterations[iteration] = aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements;
			} else {
				passed_count++;
				passed_iterations[iteration] = aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements;
			}
			runs++;
			// flip rate
			if (prevStatus === null) {
				prevStatus = testCaseIteration.failed;
			} else if (prevStatus !== testCaseIteration.failed) {
				flips++;
			}
		});

		let failRate = failed_count / runs
		let passRate = 1 - failRate
		let flipRate = flips / (runs - 1)
		let logResultPassed = 0
		let logResultFailed = 0
		if (failRate != 0) {
			logResultFailed = Math.log2(failRate)
		}
		if (passRate != 0) {
			logResultPassed = Math.log2(passRate)
		}
		let entropy = - (failRate * logResultFailed + passRate * logResultPassed)

		aggregatedTestCasesWithFlakiness.push({
            testCase: testCaseName,
			commit: commit,
			failed_count: failed_count,
			passed_count: passed_count,
			failed_iterations: failed_iterations,
			passed_iterations: passed_iterations,
			fail_rate: failRate,
			flip_rate: flipRate,
			entropy: entropy
		});
	});
	return aggregatedTestCasesWithFlakiness;
}


export function getCommitHash(logLines: string[]): string {
	let commit = logLines[logLines.findIndex((line) => line.includes("[command]/usr/local/bin/git -c protocol.version=2 fetch --no-tags --prune --progress --no-recurse-submodules --depth=1 origin"))]
		.split("--depth=1 origin")[1]
		.split(":")[0]
		.replace("+", "");
	if (!commit) {
		console.error("Could not find commit hash in log file.");
	}
	return commit;
}
