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

## How to Run the Project

1. Checkout this project to a location in your disk.
2. Open the solution file `BindComplexDataToGrid.sln` using Visual Studio 2022.
3. Restore the NuGet packages by rebuilding the solution.
4. Build the project successfully.
5. Run the application.
6. Navigate to the page hosting the Syncfusion Blazor DataGrid sample.
7. Review how values from complex object structures are displayed within the Grid.

## Project Structure

`Pages/` — contains the Razor page that hosts the Syncfusion DataGrid and binds the complex data source.

## Support and Feedback

- For general product questions, visit the [Syncfusion Community Forum](https://www.syncfusion.com/forums) or [Syncfusion Support](https://www.syncfusion.com/support).
- To report an issue specific to this sample, open a GitHub issue in this repository.
- For official documentation related to complex data binding in the DataGrid, see https://help.syncfusion.com/grid-sdk/blazor/data-grid/column-rendering#complex-data-generation

## License

This is a Syncfusion sample project provided to demonstrate product usage. Review the [Syncfusion license terms](https://www.syncfusion.com/sales/pricing?category=ui-components) before using Syncfusion components in your own applications.