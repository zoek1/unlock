import React from 'react'
import { storiesOf } from '@storybook/react'
import TimePicker from '../../components/interface/TimePicker'

const now = new Date(2019, 3, 18, 6, 35, 34)
const onChange = () => {}

storiesOf('TimePicker', module).add('the TimePIcker', () => {
  return <TimePicker now={now} onChange={onChange} />
})
