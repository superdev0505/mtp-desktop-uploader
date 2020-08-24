import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Typography from '@material-ui/core/Typography';
import { Grid, Button, Box, Slider } from '@material-ui/core';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';
import Map from '../components/Map';

import {
  setCurrentStep,
  setSequencePosition,
  setSequenceFrame,
  setSequencePoints,
  setSequenceGpxImport,
  selPoints,
  selSequenceFrame,
  selSequencePosition,
  resetPoints,
} from './slice';

import {
  getDistance,
  getBearing,
  getPitch,
  discardPointsBySeconds,
} from '../scripts/utils';
import { IGeoPoint } from '../types/IGeoPoint';

const useStyles = makeStyles((theme) => ({
  slider: {
    width: 180,
  },

  info: {
    color: 'grey',
    width: '100%',
  },
}));

interface State {
  frames: number;
  position: number;
  points: IGeoPoint[];
}

export default function SequenceModifySpace() {
  const dispatch = useDispatch();
  const propframe = useSelector(selSequenceFrame);
  const propposition = useSelector(selSequencePosition);
  const proppoints = useSelector(selPoints);

  const [state, setState] = React.useState<State>({
    frames: propframe,
    position: propposition,
    points: proppoints,
  });

  const { points } = state;

  const classes = useStyles();

  let discarded = 0;

  const resetMode = () => {
    setState({
      ...state,
      frames: 1,
      position: 1,
      points: proppoints,
    });
  };

  const confirmMode = () => {
    dispatch(setSequencePoints(points));
    dispatch(setSequenceFrame(state.frames));
    dispatch(setCurrentStep('outlier'));
  };

  const updatePoints = (positionmeter: number, frames: number) => {
    try {
      const temppoints = discardPointsBySeconds(
        proppoints.map((point: IGeoPoint) => new IGeoPoint({ ...point })),
        frames
      );

      if (positionmeter > 0) {
        const newpoints: IGeoPoint[] = [];

        let previousIdx = 0;
        for (let idx = 0; idx < temppoints.length; idx += 1) {
          const point: IGeoPoint = temppoints[idx];
          if (idx > 0 && idx < temppoints.length - 1) {
            const prevpoint = newpoints[previousIdx];
            console.log(previousIdx, prevpoint.Distance);
            const nextpoint = temppoints[idx + 1];
            const distance = getDistance(point, prevpoint);
            if (distance < positionmeter) {
              newpoints[previousIdx].setDistance(
                getDistance(prevpoint, nextpoint)
              );
              newpoints[previousIdx].setAzimuth(
                getBearing(prevpoint, nextpoint)
              );
              newpoints[previousIdx].setPitch(getPitch(prevpoint, nextpoint));
            } else {
              previousIdx = newpoints.length;
              newpoints.push(point);
            }
          } else {
            newpoints.push(point);
          }
        }
        discarded = points.length - newpoints.length;
        setState({
          ...state,
          position: positionmeter,
          frames,
          points: [...newpoints],
        });
      } else {
        discarded = points.length - temppoints.length;
        setState({
          ...state,
          position: positionmeter,
          frames,
          points: [...temppoints],
        });
      }
    } catch (e) {
      setState({
        ...state,
        position: positionmeter,
        frames,
      });
    }
  };

  const handleFrameSliderChange = (
    _event: React.ChangeEvent,
    newValue: number
  ) => {
    updatePoints(1, newValue);
  };

  const handlePositionChange = (
    _event: React.ChangeEvent,
    newValue: number
  ) => {
    updatePoints(newValue, 1);
  };

  const uploadGpx = () => {
    dispatch(setSequenceGpxImport());
    dispatch(setCurrentStep('gpx'));
  };

  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h5" align="center" color="textSecondary">
          Set image spacing
        </Typography>
        <Typography paragraph>
          You can space images by either time OR distance (not both). This is useful if you have photos very close together, and want to space them out. For example, you could set a minimum distance of 1 meters to discard photos taken in the same spot (when you we're standing still, I mean resting).
        </Typography>
        <Box mb={1}>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Typography>Minimum time between photos (seconds)</Typography>
              <Slider
                value={state.frames}
                onChange={handleFrameSliderChange}
                step={1}
                min={1}
                max={20}
                valueLabelDisplay="on"
              />
              {state.frames > 1 && (
                <Typography
                  size="small"
                  align="center"
                  className={classes.info}
                >
                  {`1 photos every ${state.frames} seconds.`}
                </Typography>
              )}
            </Grid>
            <Grid item xs={6}>
              <Typography>Minimum distance between photos (meters)</Typography>
              <Slider
                value={state.position}
                onChange={handlePositionChange}
                step={1}
                min={1}
                max={20}
                valueLabelDisplay="on"
              />
              {state.position > 1 && (
                <Typography
                  size="small"
                  align="center"
                  className={classes.info}
                >
                  {`1 photos every ${state.position} meters.`}
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>
        <Box mb={2}>
          <Button onClick={uploadGpx}>
            <AddIcon />
            <span>Import GPX Data</span>
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Map points={points} />
      </Grid>
      <Grid item xs={12}>
        <Box mr={1} display="inline-block">
          <Button
            endIcon={<ChevronRightIcon />}
            color="secondary"
            onClick={resetMode}
            variant="contained"
          >
            Reset Changes
          </Button>
        </Box>
        <Button
          endIcon={<ChevronRightIcon />}
          color="primary"
          onClick={confirmMode}
          variant="contained"
        >
          Confirm Changes
        </Button>
      </Grid>
    </>
  );
}
