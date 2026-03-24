# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - heading "Boating Forecast" [level=1] [ref=e5]
        - generic [ref=e6]:
          - paragraph [ref=e7]: "Your Location:"
          - paragraph [ref=e8]: "Latitude: 34.0522, Longitude: -118.2437"
      - generic [ref=e9]:
        - heading "Current Conditions" [level=2] [ref=e10]
        - paragraph [ref=e11]:
          - generic [ref=e12]: "Today:"
          - text: Patchy fog before 11am. Mostly sunny, with a high near 78. South wind 0 to 10 mph.
      - generic [ref=e13]:
        - heading "Wave Forecast" [level=2] [ref=e14]
        - paragraph [ref=e15]: "Current Wave Height: N/A"
      - img [ref=e18]
      - generic [ref=e19]:
        - heading "Weather Radar" [level=2] [ref=e20]
        - generic [ref=e22]:
          - generic:
            - generic [ref=e23]:
              - button "Zoom in" [ref=e24] [cursor=pointer]: +
              - button "Zoom out" [ref=e25] [cursor=pointer]: −
            - generic [ref=e26]:
              - link "Leaflet" [ref=e27] [cursor=pointer]:
                - /url: https://leafletjs.com
                - img [ref=e28]
                - text: Leaflet
              - text: "| ©"
              - link "OpenStreetMap" [ref=e32] [cursor=pointer]:
                - /url: https://www.openstreetmap.org/copyright
              - text: contributors, NOAA/NWS
  - alert [ref=e33]
```