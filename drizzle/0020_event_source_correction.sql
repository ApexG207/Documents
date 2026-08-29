UPDATE event_sources
SET name='Jiu Jitsu World League',
    base_url='https://www.jjworldleague.com',
    events_url='https://www.jjworldleague.com/events',
    last_error=NULL,
    updated_at=unixepoch()*1000
WHERE code='wjjl';
