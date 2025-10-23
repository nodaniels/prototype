import { StyleSheet } from 'react-native';

const markerRadius = 10;

export const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  legendLabel: {
    color: '#475467',
    fontSize: 14,
  },
  viewer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  marker: {
    position: 'absolute',
    width: markerRadius * 2,
    height: markerRadius * 2,
    borderRadius: markerRadius,
  },
  roomDot: {
    backgroundColor: '#22c55e',
    borderColor: '#15803d',
  },
  entranceDot: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  missingContainer: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
  },
  missingText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  floorBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  floorBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  container: {
    position: 'relative',
  },
  hiddenFloorPlan: {
    opacity: 0,
    position: 'absolute',
    pointerEvents: 'none',
  },
});
