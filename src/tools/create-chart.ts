import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { parseJsonInput } from '../utils/json-parser.js';
import { parseRange, extractSheetName, getSheetId } from '../utils/range-helpers.js';
import { ToolConfig, ToolResponse } from '../types/tools.js';
import z from 'zod';

const chartPositionSchema = z.object({
  overlayPosition: z
    .object({
      anchorCell: z
        .object({
          sheetId: z.number().describe('ID of the sheet where the chart will be placed'),
          rowIndex: z.number().describe('Row index (0-based) for chart position'),
          columnIndex: z.number().describe('Column index (0-based) for chart position'),
        })
        .required(),
      offsetXPixels: z.number().optional().describe('Horizontal offset in pixels from anchor cell'),
      offsetYPixels: z.number().optional().describe('Vertical offset in pixels from anchor cell'),
      widthPixels: z.number().optional().describe('Chart width in pixels'),
      heightPixels: z.number().optional().describe('Chart height in pixels'),
    })
    .required(),
});

const seriesSchema = z.object({
  sourceRange: z.string().describe('Data range for this series in A1 notation'),
  type: z.enum(['COLUMN', 'BAR', 'LINE', 'AREA', 'PIE', 'SCATTER']).optional(),
  targetAxis: z.enum(['LEFT_AXIS', 'RIGHT_AXIS']).optional(),
});

const createChartSchema = {
  spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
  position: chartPositionSchema.describe('Chart position settings with overlay position'),
  chartType: z
    .enum([
      'COLUMN',
      'BAR',
      'LINE',
      'AREA',
      'PIE',
      'SCATTER',
      'COMBO',
      'HISTOGRAM',
      'CANDLESTICK',
      'WATERFALL',
    ])
    .describe('Type of chart to create'),
  title: z.string().optional().describe('Chart title (optional)'),
  subtitle: z.string().optional().describe('Chart subtitle (optional)'),
  series: z.array(seriesSchema).describe('Array of data series for the chart'),
  domainRange: z.string().optional().describe('Optional domain range in A1 notation'),
  domainAxis: z.object({}).optional().describe('Domain (X) axis configuration'),
  leftAxis: z.object({}).optional().describe('Left (Y) axis configuration'),
  rightAxis: z.object({}).optional().describe('Right (Y) axis configuration'),
  legend: z.object({}).optional().describe('Legend configuration'),
  backgroundColor: z.object({}).optional().describe('Chart background color'),
  altText: z.string().optional().describe('Alternative text for accessibility'),
};

export const createChartTool: ToolConfig = {
  title: 'sheets_create_chart',
  description:
    'Create a chart in a Google Sheets spreadsheet. Sheet names with spaces should be quoted in ranges (e.g., "My Sheet"!A1:B5). Position uses overlayPosition with anchorCell containing sheetId, rowIndex, and columnIndex.',
  inputSchema: createChartSchema,
};

export async function handleCreateChart(input: any): Promise<ToolResponse> {
  try {
    // Handle JSON strings for complex objects
    if (typeof input.position === 'string') {
      input.position = parseJsonInput(input.position, 'position');
    }
    if (typeof input.backgroundColor === 'string') {
      input.backgroundColor = parseJsonInput(input.backgroundColor, 'backgroundColor');
    }
    if (typeof input.legend === 'string') {
      input.legend = parseJsonInput(input.legend, 'legend');
    }
    if (typeof input.domainAxis === 'string') {
      input.domainAxis = parseJsonInput(input.domainAxis, 'domainAxis');
    }
    if (typeof input.leftAxis === 'string') {
      input.leftAxis = parseJsonInput(input.leftAxis, 'leftAxis');
    }
    if (typeof input.rightAxis === 'string') {
      input.rightAxis = parseJsonInput(input.rightAxis, 'rightAxis');
    }

    const sheets = await getAuthenticatedClient();

    // Build the chart spec
    const chartSpec: sheets_v4.Schema$ChartSpec = {};

    if (input.title !== undefined) {
      chartSpec.title = input.title;
    }
    if (input.subtitle !== undefined) {
      chartSpec.subtitle = input.subtitle;
    }
    if (input.backgroundColor !== undefined) {
      chartSpec.backgroundColor = input.backgroundColor;
    }
    if (input.altText !== undefined) {
      chartSpec.altText = input.altText;
    }

    // Validate and fix legend position
    let legendPosition = 'BOTTOM_LEGEND';
    if (input.legend?.position) {
      // Handle cases where position is passed without _LEGEND suffix
      const pos = input.legend.position;
      if (!pos.endsWith('_LEGEND') && pos !== 'NO_LEGEND') {
        legendPosition = `${pos}_LEGEND`;
      } else {
        legendPosition = pos;
      }
    }

    // Set chart type and build basic spec
    switch (input.chartType) {
      case 'COLUMN':
        chartSpec.basicChart = {
          chartType: 'COLUMN',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'BAR':
        chartSpec.basicChart = {
          chartType: 'BAR',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'LINE':
        chartSpec.basicChart = {
          chartType: 'LINE',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'AREA':
        chartSpec.basicChart = {
          chartType: 'AREA',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'PIE':
        chartSpec.pieChart = {
          legendPosition: legendPosition,
          domain: {},
          series: {},
        };
        break;
      case 'SCATTER':
        chartSpec.basicChart = {
          chartType: 'SCATTER',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      default:
        chartSpec.basicChart = {
          chartType: input.chartType,
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
    }

    // Add axis configuration if provided
    if (chartSpec.basicChart) {
      const axes: sheets_v4.Schema$BasicChartAxis[] = [];

      if (input.domainAxis?.title) {
        const axis: sheets_v4.Schema$BasicChartAxis = {
          position: 'BOTTOM_AXIS',
        };
        if (input.domainAxis.title !== undefined) {
          axis.title = input.domainAxis.title;
        }
        axes.push(axis);
      }

      if (input.leftAxis?.title) {
        const axis: sheets_v4.Schema$BasicChartAxis = {
          position: 'LEFT_AXIS',
        };
        if (input.leftAxis.title !== undefined) {
          axis.title = input.leftAxis.title;
        }
        axes.push(axis);
      }

      if (input.rightAxis?.title) {
        const axis: sheets_v4.Schema$BasicChartAxis = {
          position: 'RIGHT_AXIS',
        };
        if (input.rightAxis.title !== undefined) {
          axis.title = input.rightAxis.title;
        }
        axes.push(axis);
      }

      if (axes.length > 0) {
        chartSpec.basicChart.axis = axes;
      }
    }

    // Parse series data and get proper grid ranges
    if (chartSpec.basicChart && input.chartType !== 'PIE' && input.series.length > 0) {
      // First, we need to identify domain (usually first column)
      // For now, we'll assume domain is in the same sheet as first series
      const firstSeries = input.series[0];
      if (!firstSeries) {
        throw new Error('At least one series is required');
      }
      const firstSeriesRange = firstSeries.sourceRange;
      const { sheetName } = extractSheetName(firstSeriesRange);

      // If we have a sheet name from the range, use it instead of the position anchor cell sheetId
      let actualSheetId = input.position.overlayPosition.anchorCell.sheetId;
      if (sheetName) {
        actualSheetId = await getSheetId(sheets, input.spreadsheetId, sheetName);
      }

      // Parse each series
      for (const series of input.series) {
        const { sheetName: seriesSheetName, range: cleanRange } = extractSheetName(
          series.sourceRange
        );
        const seriesSheetId = seriesSheetName
          ? await getSheetId(sheets, input.spreadsheetId, seriesSheetName)
          : actualSheetId;

        const gridRange = parseRange(cleanRange, seriesSheetId);

        chartSpec.basicChart.series!.push({
          series: {
            sourceRange: {
              sources: [gridRange],
            },
          },
          targetAxis: series.targetAxis || 'LEFT_AXIS',
          type: series.type || input.chartType,
        });
      }

      // Add domain
      if (input.domainRange) {
        // Use provided domain range
        const { sheetName: domainSheetName, range: domainCleanRange } = extractSheetName(
          input.domainRange
        );
        const domainSheetId = domainSheetName
          ? await getSheetId(sheets, input.spreadsheetId, domainSheetName)
          : actualSheetId;

        const domainGridRange = parseRange(domainCleanRange, domainSheetId);

        chartSpec.basicChart.domains = [
          {
            domain: {
              sourceRange: {
                sources: [domainGridRange],
              },
            },
          },
        ];
      } else {
        // Auto-detect domain from first series range
        const { sheetName: domainSheetName, range: domainCleanRange } =
          extractSheetName(firstSeriesRange);
        const domainSheetId = domainSheetName
          ? await getSheetId(sheets, input.spreadsheetId, domainSheetName)
          : actualSheetId;

        // Extract row range from first series to create domain range
        const match = domainCleanRange.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
        if (match) {
          const domainRange = `A${match[1]}:A${match[2]}`;
          const domainGridRange = parseRange(domainRange, domainSheetId);

          chartSpec.basicChart.domains = [
            {
              domain: {
                sourceRange: {
                  sources: [domainGridRange],
                },
              },
            },
          ];
        }
      }
    } else if (chartSpec.pieChart && input.chartType === 'PIE' && input.series.length > 0) {
      // For pie charts, parse the first series range
      const firstSeries = input.series[0];
      if (!firstSeries) {
        throw new Error('At least one series is required for pie chart');
      }
      const { sheetName, range: cleanRange } = extractSheetName(firstSeries.sourceRange);
      const seriesSheetId = sheetName
        ? await getSheetId(sheets, input.spreadsheetId, sheetName)
        : input.position.overlayPosition.anchorCell.sheetId;

      const gridRange = parseRange(cleanRange, seriesSheetId);

      chartSpec.pieChart.series = {
        sourceRange: {
          sources: [gridRange],
        },
      };

      // For pie charts, domain is usually labels (assume column A)
      const match = cleanRange.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
      if (match) {
        const domainRange = `A${match[1]}:A${match[2]}`;
        const domainGridRange = parseRange(domainRange, seriesSheetId);

        chartSpec.pieChart.domain = {
          sourceRange: {
            sources: [domainGridRange],
          },
        };
      }
    }

    // Create the chart
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        requests: [
          {
            addChart: {
              chart: {
                spec: chartSpec,
                position: input.position,
              },
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully created ${input.chartType} chart`, {
      spreadsheetId: response.data.spreadsheetId,
      chartId: response.data.replies?.[0]?.addChart?.chart?.chartId,
      chartType: input.chartType,
      title: input.title,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
