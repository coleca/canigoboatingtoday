import '@testing-library/jest-dom'

// Mock the react-chartjs-2 library globally for all tests
jest.mock('react-chartjs-2', () => ({
  // The 'Line' component is what we use for our TideChart
  Line: ({ options }) => {
    // A simple mock that renders the chart's title.
    // This allows us to test that the component is being rendered with the correct props
    // without needing a real <canvas> element.
    const titleText = options?.plugins?.title?.text || ''
    return <div>{titleText}</div>
  },
}))
