# Blazor DataGrid Bind Complex Data to Grid

## Overview

This sample demonstrates how to bind complex object data to a Syncfusion Blazor DataGrid. Instead of using a collection that contains only primitive properties, the Grid is configured to consume records that contain nested or related objects and display values from those complex structures. This pattern is useful when application data is represented through rich domain models and Grid columns must access values from object hierarchies rather than flat data sources.

## Key Features

- Demonstrates binding complex object data to a Syncfusion Blazor DataGrid.
- Shows how Grid columns can display values originating from nested object structures.
- Uses a dedicated data source defined within the project to populate Grid records.
- Provides a reference implementation for displaying non-flat business models inside a Grid.
- Demonstrates DataGrid rendering with object-based data rather than simple primitive collections.
- Includes supporting model and data-generation classes used by the sample.

## Prerequisites

* Visual Studio 2022
* Visual Studio Code

## How to Run the Project

**Visual Studio 2022**

1. Clone or download the repository.
2. Open the verified solution file: `CrudAsynchronousSample.sln`.
3. Restore NuGet packages.
4. Ensure the startup project is `CrudAsynchronousSample` if multiple startup projects are present.
5. Build the solution.
6. Run the application using `Ctrl+F5`.
7. Access the application at the local URL displayed by the ASP.NET Core launch output. `[VERIFY: local development URL]`

**Visual Studio Code**

1. Open the repository folder in Visual Studio Code.
2. Open the integrated terminal.
3. Navigate to the project directory that contains `CrudAsynchronousSample.csproj`.

```bash
dotnet restore
dotnet run
```

## Project Structure

`Pages/` — contains the Razor page that hosts the Syncfusion DataGrid and binds the complex data source.

## Support and Feedback

- For general product questions, visit the [Syncfusion Community Forum](https://www.syncfusion.com/forums) or [Syncfusion Support](https://www.syncfusion.com/support).
- To report an issue specific to this sample, open a GitHub issue in this repository.
- For official documentation related to complex data binding in the DataGrid, see https://help.syncfusion.com/grid-sdk/blazor/data-grid/column-rendering#complex-data-generation

## License

This is a Syncfusion sample project provided to demonstrate product usage. Review the [Syncfusion license terms](https://www.syncfusion.com/sales/pricing?category=ui-components) before using Syncfusion components in your own applications.
