import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DateTime } from 'luxon';
import './App.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const ControlPanel = styled.div`
  width: 300px;
  background: #f8f9fa;
  padding: 20px;
  border-right: 1px solid #dee2e6;
  overflow-y: auto;
`;

const MapContainerStyled = styled.div`
  flex: 1;
  height: 100vh;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 24px;
  text-align: center;
`;

const ControlGroup = styled.div`
  margin-bottom: 30px;
`;

const ControlLabel = styled.label`
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #34495e;
`;

const DaySelectorContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 20px;
`;

const DayButton = styled.button`
  flex: 1;
  min-width: 60px;
  padding: 8px 4px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background: ${props => props.isSelected ? '#3498db' : 'white'};
  color: ${props => props.isSelected ? 'white' : '#2c3e50'};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.isSelected ? '#2980b9' : '#ecf0f1'};
  }
`;

const TemperatureTabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TemperatureTab = styled.button`
  padding: 12px 16px;
  border: 2px solid ${props => props.isSelected ? '#3498db' : '#ddd'};
  border-radius: 8px;
  background: ${props => props.isSelected ? '#3498db' : 'white'};
  color: ${props => props.isSelected ? 'white' : '#2c3e50'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${props => props.isSelected ? '#2980b9' : '#ecf0f1'};
    border-color: ${props => props.isSelected ? '#2980b9' : '#3498db'};
  }
`;

const TemperatureRange = styled.div`
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 5px;
`;

const Legend = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #dee2e6;
`;

const LegendTitle = styled.h4`
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin: 5px 0;
  font-size: 12px;
`;

const LegendColor = styled.div`
  width: 20px;
  height: 15px;
  margin-right: 8px;
  border-radius: 3px;
  background: ${props => props.color};
`;

function App() {
  const [selectedDay, setSelectedDay] = useState(0); // 0 = today, 1 = tomorrow, etc.
  const [selectedTempRange, setSelectedTempRange] = useState('ideal'); // ideal, warm, cool, hot, cold
  const [statesData, setStatesData] = useState(null);
  const [weatherData, setWeatherData] = useState({});

  // Temperature range definitions
  const temperatureRanges = {
    cold: { min: 30, max: 50, label: 'Cold Weather', description: '30-50°F' },
    cool: { min: 50, max: 65, label: 'Cool Weather', description: '50-65°F' },
    ideal: { min: 65, max: 75, label: 'Ideal Weather', description: '65-75°F' },
    warm: { min: 75, max: 85, label: 'Warm Weather', description: '75-85°F' },
    hot: { min: 85, max: 100, label: 'Hot Weather', description: '85-100°F' }
  };

  // Load USA states GeoJSON data
  useEffect(() => {
    fetch('/data/us-states.json')
      .then(response => response.json())
      .then(data => {
        setStatesData(data);
        // Initialize mock weather data for each state for 7 days
        const mockWeather = {};
        data.features.forEach(state => {
          const stateCode = state.properties.state;
          mockWeather[stateCode] = {
            forecast: Array.from({ length: 7 }).map((_, dayIndex) => ({
              highTemperature: Math.floor(Math.random() * 40) + 40, // 40-80°F
              lowTemperature: Math.floor(Math.random() * 20) + 30,  // 30-50°F
              humidity: Math.floor(Math.random() * 40) + 30 // 30-70%
            }))
          };
        });
        setWeatherData(mockWeather);
      })
      .catch(error => console.error('Error loading states data:', error));
  }, []);

  // Calculate golf suitability score (0-100) based on high temperature
  const calculateGolfScore = (stateCode) => {
    if (!weatherData[stateCode] || !weatherData[stateCode].forecast[selectedDay]) return 0;
    
    const { highTemperature } = weatherData[stateCode].forecast[selectedDay];
    const tempRange = temperatureRanges[selectedTempRange];
    
    // Check if temperature is within selected range
    const tempInRange = highTemperature >= tempRange.min && highTemperature <= tempRange.max;
    
    if (!tempInRange) return 0;
    
    // Calculate score based on how close to ideal conditions
    const idealTemp = 70; // Ideal golf temperature
    const tempScore = Math.max(0, 100 - Math.abs(highTemperature - idealTemp) * 2);
    
    return Math.round(tempScore);
  };

  const getStyle = (feature) => {
    const stateCode = feature.properties.state;
    const golfScore = calculateGolfScore(stateCode);
    
    // Color scale: red (poor) -> yellow (okay) -> green (excellent)
    let fillColor;
    if (golfScore === 0) {
      fillColor = '#e74c3c'; // Red for unsuitable
    } else if (golfScore < 30) {
      fillColor = '#f39c12'; // Orange for poor
    } else if (golfScore < 60) {
      fillColor = '#f1c40f'; // Yellow for fair
    } else if (golfScore < 80) {
      fillColor = '#2ecc71'; // Light green for good
    } else {
      fillColor = '#27ae60'; // Dark green for excellent
    }
    
    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: '#34495e',
      fillOpacity: 0.8
    };
  };

  const getDayLabel = (dayIndex) => {
    if (dayIndex === 0) return 'Today';
    if (dayIndex === 1) return 'Tomorrow';
    return DateTime.local().plus({ days: dayIndex }).toFormat('EEE');
  };

  return (
    <AppContainer>
      <ControlPanel>
        <Title>Golf Heat Map USA</Title>
        
        <ControlGroup>
          <ControlLabel>7-Day Forecast</ControlLabel>
          <DaySelectorContainer>
            {Array.from({ length: 7 }).map((_, index) => (
              <DayButton
                key={index}
                isSelected={selectedDay === index}
                onClick={() => setSelectedDay(index)}
              >
                {getDayLabel(index)}
              </DayButton>
            ))}
          </DaySelectorContainer>
        </ControlGroup>
        
        <ControlGroup>
          <ControlLabel>Temperature Preference</ControlLabel>
          <TemperatureTabsContainer>
            {Object.entries(temperatureRanges).map(([key, range]) => (
              <TemperatureTab
                key={key}
                isSelected={selectedTempRange === key}
                onClick={() => setSelectedTempRange(key)}
              >
                {range.label}
                <TemperatureRange>{range.description}</TemperatureRange>
              </TemperatureTab>
            ))}
          </TemperatureTabsContainer>
        </ControlGroup>

        <Legend>
          <LegendTitle>Golf Conditions Legend</LegendTitle>
          <LegendItem>
            <LegendColor color="#27ae60" />
            <span>Excellent (80-100)</span>
          </LegendItem>
          <LegendItem>
            <LegendColor color="#2ecc71" />
            <span>Good (60-79)</span>
          </LegendItem>
          <LegendItem>
            <LegendColor color="#f1c40f" />
            <span>Fair (30-59)</span>
          </LegendItem>
          <LegendItem>
            <LegendColor color="#f39c12" />
            <span>Poor (1-29)</span>
          </LegendItem>
          <LegendItem>
            <LegendColor color="#e74c3c" />
            <span>Unsuitable (0)</span>
          </LegendItem>
        </Legend>
      </ControlPanel>

      <MapContainerStyled>
        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          maxBounds={[[20, -130], [50, -60]]} // Restrict to USA only
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {statesData && (
            <GeoJSON
              data={statesData}
              style={getStyle}
              onEachFeature={(feature, layer) => {
                const stateCode = feature.properties.state;
                const stateName = feature.properties.name;
                const weather = weatherData[stateCode]?.forecast[selectedDay];
                const golfScore = calculateGolfScore(stateCode);
                
                if (weather) {
                  layer.bindPopup(`
                    <div style="font-family: Arial, sans-serif; min-width: 200px;">
                      <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${stateName}</h3>
                      <p style="margin: 5px 0;"><strong>High Temperature:</strong> ${weather.highTemperature}°F</p>
                      <p style="margin: 5px 0;"><strong>Low Temperature:</strong> ${weather.lowTemperature}°F</p>
                      <p style="margin: 5px 0;"><strong>Humidity:</strong> ${weather.humidity}%</p>
                      <p style="margin: 5px 0;"><strong>Golf Score:</strong> ${golfScore}/100</p>
                      <div style="margin-top: 10px; padding: 5px; background: ${golfScore > 60 ? '#d5f4e6' : golfScore > 30 ? '#fff3cd' : '#f8d7da'}; border-radius: 3px;">
                        ${golfScore > 60 ? '🏌️ Excellent golf weather!' : golfScore > 30 ? '⛳ Fair golf conditions' : '🌡️ Poor golf conditions'}
                      </div>
                    </div>
                  `);
                }
              }}
            />
          )}
        </MapContainer>
      </MapContainerStyled>
    </AppContainer>
  );
}

export default App;