import * as fs from "fs";
import {
	aggregateMeasurementsByTestCase,
	calculateFlakiness,
	getStartAndEndTimeOfTestCasesInLog,
	getCommitHash
} from "./functions";
import {
	AggregatedTestCaseWithFlakiness,
	AggregatedTestCaseWithMeasurementsMap,
	JsonFormat,
	TimedTestCaseIterationsMap,
} from "./types";

let startTime = Date.now();
console.log("Starting...\n\nReading log file...");
const logLines = fs.readFileSync("../data/raw/logs.log", "utf8").toString().split("\n");
console.log("Found " + logLines.length + " lines...");

let commit = getCommitHash(logLines);

let testCases: TimedTestCaseIterationsMap = getStartAndEndTimeOfTestCasesInLog(logLines);

console.log("Found " + Object.keys(testCases).length + " test cases.\n");

const stats: JsonFormat = JSON.parse(fs.readFileSync("../data/raw/raw-stats.json", "utf8"));
console.log("Found " + Object.keys(stats).length + " stat entries...\n");

console.log("Aggregating measurements by test case...");
let aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap = aggregateMeasurementsByTestCase(testCases, stats);
console.log("\nDone aggregating measurements by test case.\n");

console.log("Calculating flakiness for each test case...");
let aggregatedTestCasesWithFlakiness: AggregatedTestCaseWithFlakiness[] = calculateFlakiness(aggregatedMeasurementsByTestCase, aggregatedMeasurementsByTestCase, commit);
console.log("Done calculating flakiness for each test case.\n");

console.log("Writing aggregated stats to file...");
fs.writeFileSync("../data/aggregated-stats.json", JSON.stringify(aggregatedTestCasesWithFlakiness, null, 2));

let endTime = Date.now();
console.log("Done writing aggregated stats to file.\n\nFinished. Took " + (endTime - startTime) + "ms in total.");
