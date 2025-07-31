import { ToolConfig } from '../types/tools.js';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { parseJsonInput } from '../utils/json-parser.js';
import { ToolResponse } from '../types/tools.js';
import { z } from 'zod';

export const updateChartTool: ToolConfig = {
  title: 'sheets_update_chart',
  description: 'Update an existing chart in a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    chartId: z
      .number()
      .describe('The ID of the chart to update (use sheets_get_metadata to find chart IDs)'),
    position: z.any().optional().describe('Updated chart position settings (optional)'),
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
      .optional()
      .describe('Updated chart type (optional)'),
    title: z.string().optional().describe('Updated chart title (optional)'),
    subtitle: z.string().optional().describe('Updated chart subtitle (optional)'),
    series: z
      .array(
        z.object({
          sourceRange: z.string().describe('Data range for this series in A1 notation'),
          type: z
            .enum(['COLUMN', 'BAR', 'LINE', 'AREA', 'PIE', 'SCATTER'])
            .optional()
            .describe('Chart type for this series (for combo charts)'),
          targetAxis: z
            .enum(['LEFT_AXIS', 'RIGHT_AXIS'])
            .optional()
            .describe('Which axis this series should use'),
        })
      )
      .optional()
      .describe('Updated array of data series for the chart (optional)'),
    domainAxis: z.any().optional().describe('Updated domain (X) axis configuration (optional)'),
    leftAxis: z.any().optional().describe('Updated left (Y) axis configuration (optional)'),
    rightAxis: z.any().optional().describe('Updated right (Y) axis configuration (optional)'),
    legend: z.any().optional().describe('Updated legend configuration (optional)'),
    backgroundColor: z.any().optional().describe('Updated chart background color (optional)'),
    altText: z
      .string()
      .optional()
      .describe('Updated alternative text for accessibility (optional)'),
  },
};

export async function handleUpdateChart(input: any): Promise<ToolResponse> {
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

    // First, get the current chart to understand what we're updating
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: input.spreadsheetId,
    });

    let currentChart: sheets_v4.Schema$EmbeddedChart | undefined;

    // Find the chart in the spreadsheet
    for (const sheet of spreadsheet.data.sheets || []) {
      const chart = sheet.charts?.find((c: any) => c.chartId === input.chartId);
      if (chart) {
        currentChart = chart;
        break;
      }
    }

    if (!currentChart) {
      throw new Error(`Chart with ID ${input.chartId} not found`);
    }

    // Build the updated chart spec based on current chart and new values
    const updatedChart: sheets_v4.Schema$EmbeddedChart = {
      chartId: input.chartId,
      position: (input.position || currentChart.position)!,
      spec: {
        ...currentChart.spec,
      },
    };

    // Update spec properties only if they are defined
    if (input.title !== undefined) {
      updatedChart.spec!.title = input.title;
    }
    if (input.subtitle !== undefined) {
      updatedChart.spec!.subtitle = input.subtitle;
    }
    if (input.backgroundColor !== undefined) {
      updatedChart.spec!.backgroundColor = input.backgroundColor;
    }
    if (input.altText !== undefined) {
      updatedChart.spec!.altText = input.altText;
    }

    // Update chart type and structure if specified
    if (input.chartType) {
      switch (input.chartType) {
        case 'PIE':
          updatedChart.spec!.pieChart = {
            legendPosition: input.legend?.position || 'BOTTOM_LEGEND',
            domain: currentChart.spec?.pieChart?.domain || {},
            series: currentChart.spec?.pieChart?.series || {},
          };
          // Clear other chart types
          delete updatedChart.spec!.basicChart;
          break;
        default:
          updatedChart.spec!.basicChart = {
            chartType: input.chartType,
            legendPosition: input.legend?.position || 'BOTTOM_LEGEND',
            axis: currentChart.spec?.basicChart?.axis || [],
            domains: currentChart.spec?.basicChart?.domains || [],
            series: currentChart.spec?.basicChart?.series || [],
          };
          // Clear other chart types
          delete updatedChart.spec!.pieChart;
      }
    }

    // Update legend if provided
    if (input.legend) {
      if (updatedChart.spec!.basicChart) {
        updatedChart.spec!.basicChart.legendPosition = input.legend.position || 'BOTTOM_LEGEND';
      } else if (updatedChart.spec!.pieChart) {
        updatedChart.spec!.pieChart.legendPosition = input.legend.position || 'BOTTOM_LEGEND';
      }
    }

    // Update series if provided
    if (input.series && updatedChart.spec!.basicChart) {
      updatedChart.spec!.basicChart.series = input.series.map((series: any, _index: number) => {
        const basicSeries: sheets_v4.Schema$BasicChartSeries = {
          series: {
            sourceRange: {
              sources: [
                {
                  sheetId: (input.position?.overlayPosition?.anchorCell?.sheetId ||
                    currentChart.position?.overlayPosition?.anchorCell?.sheetId) as number,
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endRowIndex: 100,
                  endColumnIndex: 1,
                },
              ],
            },
          },
          targetAxis: series.targetAxis || 'LEFT_AXIS',
        };

        if (series.type !== undefined) {
          basicSeries.type = series.type;
        } else if (input.chartType !== undefined) {
          basicSeries.type = input.chartType;
        }

        return basicSeries;
      });
    }

    // Update the chart
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        requests: [
          {
            updateEmbeddedObjectPosition: {
              objectId: input.chartId,
              newPosition: updatedChart.position,
              fields: 'position',
            },
          },
          {
            updateChartSpec: {
              chartId: input.chartId,
              spec: updatedChart.spec,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully updated chart ${input.chartId}`, {
      spreadsheetId: response.data.spreadsheetId,
      chartId: input.chartId,
      updatedFields: Object.keys(input).filter(
        (key) => key !== 'spreadsheetId' && key !== 'chartId'
      ),
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
