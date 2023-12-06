# Does Hitting Resource Limitations Increase Test Flakiness?

This repository contains the code (`src`) and text (`paper`) for the [FTW](https://conf.researchr.org/home/icse-2024/ftw-2024) paper "Does Hitting Resource Limitations Increase Test Flakiness?"


## Generating Aggregated Statistics File from a Project

### Retrieving the Data
1. Copy the GitHub Workflow file at `src/workflow.yml` into the projects you want to include. To be recognized by GitHub, it needs to be put in `.github/workflows/`.
- In the workflow file:
	- change `<path-to-proj.xcodeproj>` with the actual path to the project file (or workspace).
	- change `<scheme>` to the name of the scheme in the project containing the UI Tests. If not present, open the project, create a new scheme and select only the UI Tests' target.
<details>
  <summary markdown="span">See screenshots</summary>
![new-scheme](images/new-scheme.jpg)
![target-scheme](images/target-scheme.jpg)
</details>

- Push the changes to GitHub. GitHub will recognize the workflow and start running the UI Tests. You can access the run in the Actions tab of the GitHub Project.
- Once finished, access the workflow's details.
	- Download the artifact named `raw-stats` containing a json file with all resource measurements. Unzip and save this file in `src/data`.
	- Click on the workflow's job `ui-tests-run` and "View the raw logs" to export the logs file. Save the file as `logs.file` and put it `src/data`.
<details>
  <summary markdown="span">See screenshots</summary>
![view-raw-logs](images/view-raw-logs.jpg)
</details>

### Merging the two files

cd into `src/parse-logs` and execute `npm run build; npm run run`. A json file containing the aggregated data will be generated at `src/data/aggregated-stats.json`.

If you have multiple projects you can merge the json arrays in each `aggregated-stats.json` into one.

## Calculating Results

1. Make sure to have a `aggregated-stats.json` file in `src/data`. This could contain the data from a single or multiple projects.
2. cd into `src` and install the required python libraries: `pip install -r requirements.txt`
3. Calculate all results:
	- To answer Research Question 1: `python test_cases.py <resource> <threshold>` (e.g.: `python test_cases.py totalLoad 99`)
	- To answer Research Question 2: open `src/test-executions.ipynb` ... TODO